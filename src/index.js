import 'dotenv/config';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function expandPath(pathStr) {
  if (pathStr.startsWith('~/')) {
    return pathStr.replace('~', os.homedir());
  }
  return pathStr;
}

const RAW_DIR = expandPath(process.env.RAW_DIR || '~/Google Drive/マイドライブ/obsidian/private/98-raw');
const OUTPUT_BASE_DIR = expandPath(process.env.OUTPUT_DIR || '~/Google Drive/マイドライブ/obsidian/private/2-source');

class ObsidianProcessor {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async start() {
    console.log(`監視開始: ${RAW_DIR}`);
    
    const watcher = chokidar.watch(RAW_DIR, {
      ignored: /(^|[\/\\])\../, 
      persistent: true,
      ignoreInitial: false
    });

    watcher.on('add', async (filePath) => {
      if (path.extname(filePath) === '.md') {
        console.log(`新しいファイルを検出: ${filePath}`);
        await this.processFile(filePath);
      }
    });

    console.log('ファイル監視中...');
  }

  async processFile(filePath) {
    try {
      console.log(`処理開始: ${path.basename(filePath)}`);
      
      const content = await fs.readFile(filePath, 'utf8');
      const { frontMatter, bodyContent } = this.parseFrontMatter(content);
      
      if (!frontMatter.source || !frontMatter.published) {
        console.log('必要なメタデータが不足しています');
        return;
      }

      const domain = this.extractDomain(frontMatter.source);
      const publishedDate = this.formatDate(frontMatter.published);
      
      const outputDir = path.join(OUTPUT_BASE_DIR, domain, publishedDate);
      await fs.mkdir(outputDir, { recursive: true });
      
      const processedContent = await this.processContent(bodyContent);
      
      const newContent = this.createNewContent(frontMatter, processedContent);
      
      const outputPath = path.join(outputDir, path.basename(filePath));
      await fs.writeFile(outputPath, newContent, 'utf8');
      
      await fs.unlink(filePath);
      
      console.log(`処理完了: ${outputPath}`);
      
    } catch (error) {
      console.error(`エラー: ${error.message}`);
    }
  }

  parseFrontMatter(content) {
    const frontMatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    
    if (!frontMatterMatch) {
      throw new Error('YAMLフロントマターが見つかりません');
    }
    
    const frontMatter = yaml.load(frontMatterMatch[1]);
    const bodyContent = frontMatterMatch[2];
    
    return { frontMatter, bodyContent };
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (error) {
      return 'unknown';
    }
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  async loadPrompt() {
    try {
      const promptPath = path.join(__dirname, '..', 'prompts', 'content-process.txt');
      return await fs.readFile(promptPath, 'utf8');
    } catch (error) {
      console.error('プロンプトファイル読み込みエラー:', error);
      return null;
    }
  }

  async processContent(content) {
    const promptTemplate = await this.loadPrompt();
    if (!promptTemplate) {
      throw new Error('プロンプトファイルの読み込みに失敗しました');
    }
    
    const prompt = promptTemplate.replace('{{CONTENT}}', content);

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('コンテンツ処理エラー:', error);
      return 'コンテンツの処理中にエラーが発生しました。';
    }
  }

  createNewContent(frontMatter, processedContent) {
    const yamlContent = yaml.dump(frontMatter);
    
    return `---
${yamlContent}---

${processedContent}`;
  }
}


if (process.env.GEMINI_API_KEY) {
  const processor = new ObsidianProcessor();
  processor.start().catch(console.error);
} else {
  console.error('GEMINI_API_KEY環境変数を設定してください');
  process.exit(1);
}