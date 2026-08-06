import { getCookie, getQuery, localStorageGetItem, localStorageSetItem } from 'ranuts/utils';

/**
 * Internationalization configuration
 */

/**
 * Language codes enum
 * Internal language codes: 'zh' (Simplified) | 'zh-tw' (Traditional) | 'en'
 * OnlyOffice language codes (BCP 47 standard): 'zh-CN' | 'zh-TW' | 'en'
 */
export enum LanguageCode {
  /** Simplified Chinese (internal) */
  ZH = 'zh',
  /** Traditional Chinese (internal) */
  ZH_TW = 'zh-tw',
  /** English (internal) */
  EN = 'en',
}

/**
 * OnlyOffice language codes (BCP 47 standard)
 */
export enum OnlyOfficeLanguageCode {
  /** Simplified Chinese (Mainland China) - BCP 47 standard */
  ZH_CN = 'zh-CN',
  /** Traditional Chinese (Taiwan) - BCP 47 standard */
  ZH_TW = 'zh-TW',
  /** English */
  EN = 'en',
}

export type Language = LanguageCode.ZH | LanguageCode.ZH_TW | LanguageCode.EN;

export interface I18nMessages {
  // UI text
  webOffice: string;
  uploadDocument: string;
  newWord: string;
  newExcel: string;
  newPowerPoint: string;
  menu: string;
  menuGuide: string;

  // Messages
  fileSavedSuccess: string;
  documentLoaded: string;

  // Error messages
  failedToLoadEditor: string;
  unsupportedFileType: string;
  invalidFileObject: string;
  documentOperationFailed: string;

  // AI agent panel
  agentTitle: string;
  agentOpenTip: string;
  agentSettings: string;
  agentRoleUser: string;
  agentRoleTool: string;
  agentRoleError: string;
  agentProviderClaude: string;
  agentProviderOpenAI: string;
  agentProviderGemini: string;
  agentProviderLocal: string;
  agentProviderOllama: string;
  agentOllamaModelPlaceholder: string;
  agentOllamaHint: string;
  agentLoadModel: string;
  agentModelLoaded: string;
  agentCheckingCache: string;
  agentModelCached: string;
  /** `{size}` placeholder is replaced with the model's download size. */
  agentModelFirstDownload: string;
  agentNoWebGPU: string;
  agentLocalChatOnly: string;
  agentSwitchCloud: string;
  agentReviewMode: string;
  agentQuote: string;
  agentQuoteTip: string;
  agentClear: string;
  agentInputPlaceholder: string;
  agentSend: string;
  agentStop: string;
  agentNeedKey: string;
  agentNoSelection: string;
  agentQuotePrefix: string;
  agentStopped: string;
  agentMaxSteps: string;
  agentToolCallPrefix: string;
  agentToolErrorPrefix: string;
}

const messages: Record<Language, I18nMessages> = {
  [LanguageCode.ZH]: {
    webOffice: 'Web Office',
    uploadDocument: '查看/编辑文档',
    newWord: '新建 Word',
    newExcel: '新建 Excel',
    newPowerPoint: '新建 PowerPoint',
    menu: '菜单',
    menuGuide: '菜单在右下角，悬停即可查看（点击关闭后不再提示）',
    fileSavedSuccess: '文件保存成功：',
    documentLoaded: '文档加载完成：',
    failedToLoadEditor: '无法加载编辑器组件。请确保已正确安装 OnlyOffice API。',
    unsupportedFileType: '不支持的文件类型：',
    invalidFileObject: '无效的文件对象',
    documentOperationFailed: '文档操作失败：',
    agentTitle: 'AI 助手',
    agentOpenTip: '打开 AI 助手',
    agentSettings: '设置',
    agentRoleUser: '你',
    agentRoleTool: '工具',
    agentRoleError: '错误',
    agentProviderClaude: 'Claude（云端，需 API Key）',
    agentProviderOpenAI: 'OpenAI（云端，需 API Key）',
    agentProviderGemini: 'Gemini（云端，需 API Key）',
    agentProviderLocal: '本地离线（WebLLM，需 WebGPU）',
    agentProviderOllama: 'Ollama（本地服务，需自行运行）',
    agentOllamaModelPlaceholder: '模型名，如 llama3.2',
    agentOllamaHint: '连接本地 Ollama（http://localhost:11434），无需 API Key，请确保已运行对应模型。',
    agentLoadModel: '加载模型',
    agentModelLoaded: '模型已加载，可以开始对话。',
    agentCheckingCache: '检查模型缓存…',
    agentModelCached: '该模型已缓存，点击「加载模型」秒开（刷新页面也不会重新下载）。',
    agentModelFirstDownload: '首次使用需下载（{size}），之后浏览器缓存，刷新不再下载。',
    agentNoWebGPU: '当前浏览器不支持 WebGPU，无法使用本地模式。',
    agentLocalChatOnly: '本地模型仅用于问答/改写，不会直接编辑文档。如需 AI 直接编辑文档，',
    agentSwitchCloud: '切换到云端 →',
    agentReviewMode: '修订模式',
    agentQuote: '引用选区',
    agentQuoteTip: '把当前在文档/表格/幻灯片中选中的文字引用到输入框',
    agentClear: '清空对话',
    agentInputPlaceholder: '让 AI 帮你编辑文档…（Enter 发送，Shift+Enter 换行）',
    agentSend: '发送',
    agentStop: '停止',
    agentNeedKey: '请先填写 API Key。',
    agentNoSelection: '没有检测到选中的内容，请先在文档中选择文字。',
    agentQuotePrefix: '请参考我选中的内容：',
    agentStopped: '已停止。',
    agentMaxSteps: '已达到最大执行步数，已停止。',
    agentToolCallPrefix: '调用工具：',
    agentToolErrorPrefix: '工具出错：',
  },
  [LanguageCode.ZH_TW]: {
    webOffice: 'Web Office',
    uploadDocument: '檢視/編輯文件',
    newWord: '新增 Word',
    newExcel: '新增 Excel',
    newPowerPoint: '新增 PowerPoint',
    menu: '選單',
    menuGuide: '選單在右下角，懸停即可檢視（點選關閉後不再提示）',
    fileSavedSuccess: '檔案儲存成功：',
    documentLoaded: '文件載入完成：',
    failedToLoadEditor: '無法載入編輯器元件。請確保已正確安裝 OnlyOffice API。',
    unsupportedFileType: '不支援的檔案型別：',
    invalidFileObject: '無效的檔案物件',
    documentOperationFailed: '文件操作失敗：',
    agentTitle: 'AI 助手',
    agentOpenTip: '開啟 AI 助手',
    agentSettings: '設定',
    agentRoleUser: '你',
    agentRoleTool: '工具',
    agentRoleError: '錯誤',
    agentProviderClaude: 'Claude（雲端，需 API Key）',
    agentProviderOpenAI: 'OpenAI（雲端，需 API Key）',
    agentProviderGemini: 'Gemini（雲端，需 API Key）',
    agentProviderLocal: '本地離線（WebLLM，需 WebGPU）',
    agentProviderOllama: 'Ollama（本機服務，需自行執行）',
    agentOllamaModelPlaceholder: '模型名，如 llama3.2',
    agentOllamaHint: '連接本機 Ollama（http://localhost:11434），無需 API Key，請確保已執行對應模型。',
    agentLoadModel: '載入模型',
    agentModelLoaded: '模型已載入，可以開始對話。',
    agentCheckingCache: '檢查模型快取…',
    agentModelCached: '該模型已快取，點選「載入模型」秒開（重新整理頁面也不會重新下載）。',
    agentModelFirstDownload: '首次使用需下載（{size}），之後瀏覽器快取，重新整理不再下載。',
    agentNoWebGPU: '當前瀏覽器不支援 WebGPU，無法使用本機模式。',
    agentLocalChatOnly: '本機模型僅用於問答/改寫，不會直接編輯文件。如需 AI 直接編輯文件，',
    agentSwitchCloud: '切換到雲端 →',
    agentReviewMode: '修訂模式',
    agentQuote: '引用選區',
    agentQuoteTip: '把當前在文件/表格/投影片中選中的文字引用到輸入框',
    agentClear: '清空對話',
    agentInputPlaceholder: '讓 AI 幫你編輯文件…（Enter 傳送，Shift+Enter 換行）',
    agentSend: '傳送',
    agentStop: '停止',
    agentNeedKey: '請先填寫 API Key。',
    agentNoSelection: '沒有檢測到選中的內容，請先在文件中選擇文字。',
    agentQuotePrefix: '請參考我選中的內容：',
    agentStopped: '已停止。',
    agentMaxSteps: '已達到最大執行步數，已停止。',
    agentToolCallPrefix: '呼叫工具：',
    agentToolErrorPrefix: '工具出錯：',
  },
  [LanguageCode.EN]: {
    webOffice: 'Web Office',
    uploadDocument: 'View/Edit Document',
    newWord: 'New Word',
    newExcel: 'New Excel',
    newPowerPoint: 'New PowerPoint',
    menu: 'Menu',
    menuGuide: "Menu is in the bottom right corner, hover to view (click to close, won't show again)",
    fileSavedSuccess: 'File saved successfully: ',
    documentLoaded: 'Document loaded: ',
    failedToLoadEditor: 'Failed to load editor component. Please ensure OnlyOffice API is properly installed.',
    unsupportedFileType: 'Unsupported file type: ',
    invalidFileObject: 'Invalid file object',
    documentOperationFailed: 'Document operation failed: ',
    agentTitle: 'AI Assistant',
    agentOpenTip: 'Open AI Assistant',
    agentSettings: 'Settings',
    agentRoleUser: 'You',
    agentRoleTool: 'Tool',
    agentRoleError: 'Error',
    agentProviderClaude: 'Claude (cloud, needs API Key)',
    agentProviderOpenAI: 'OpenAI (cloud, needs API Key)',
    agentProviderGemini: 'Gemini (cloud, needs API Key)',
    agentProviderLocal: 'Local offline (WebLLM, needs WebGPU)',
    agentProviderOllama: 'Ollama (local server, run it yourself)',
    agentOllamaModelPlaceholder: 'Model name, e.g. llama3.2',
    agentOllamaHint: 'Connects to local Ollama (http://localhost:11434); no API Key — make sure the model is running.',
    agentLoadModel: 'Load model',
    agentModelLoaded: 'Model loaded — you can start chatting.',
    agentCheckingCache: 'Checking model cache…',
    agentModelCached: 'This model is cached — click "Load model" for an instant start (a refresh won\'t re-download).',
    agentModelFirstDownload:
      "First use downloads the model ({size}); it is then cached, so a refresh won't re-download.",
    agentNoWebGPU: 'This browser does not support WebGPU; local mode is unavailable.',
    agentLocalChatOnly:
      'The local model only answers and rewrites — it will not edit the document directly. For AI-driven editing, ',
    agentSwitchCloud: 'switch to cloud →',
    agentReviewMode: 'Review mode',
    agentQuote: 'Quote selection',
    agentQuoteTip: 'Quote the text currently selected in the document/spreadsheet/slide into the input',
    agentClear: 'Clear chat',
    agentInputPlaceholder: 'Ask AI to edit the document… (Enter to send, Shift+Enter for newline)',
    agentSend: 'Send',
    agentStop: 'Stop',
    agentNeedKey: 'Please enter an API Key first.',
    agentNoSelection: 'No selection detected — please select text in the document first.',
    agentQuotePrefix: 'Please consider my selected content:',
    agentStopped: 'Stopped.',
    agentMaxSteps: 'Reached the maximum number of steps; stopped.',
    agentToolCallPrefix: 'Tool call: ',
    agentToolErrorPrefix: 'Tool error: ',
  },
};

class I18n {
  private currentLanguage: Language = LanguageCode.EN;

  /**
   * Get cookie value by name (using ranuts utility)
   */
  private getCookie(name: string): string | null {
    return getCookie(name);
  }

  /**
   * Get URL parameter by name (using ranuts utility)
   */
  private getUrlParameter(name: string): string | null {
    return getQuery()?.[name] || null;
  }

  /**
   * Normalize language code to LanguageCode enum
   * Supports: 'zh', 'zh-CN', 'zh_CN', 'zh-TW', 'zh_HK', 'zh-Hant', 'en', 'en-US', etc.
   */
  private normalizeLanguage(lang: string | null): Language | null {
    if (!lang) return null;
    const low = lang.toLowerCase();
    const parts = low.split(/[-_]/);
    if (parts[0] === 'zh') {
      // Traditional Chinese regions / scripts -> ZH_TW, otherwise Simplified ZH.
      const region = parts[1] || '';
      if (region === 'tw' || region === 'hk' || region === 'mo' || region === 'hant') {
        return LanguageCode.ZH_TW;
      }
      return LanguageCode.ZH;
    }
    if (parts[0] === 'en') return LanguageCode.EN;
    return null;
  }

  constructor() {
    // Priority: URL locale -> cookie -> localStorage -> navigator.language -> 'en'
    let detectedLang: Language | null = null;

    // 1. Try to get from URL parameter 'locale' (highest priority)
    const urlLocale = this.getUrlParameter('locale');
    detectedLang = this.normalizeLanguage(urlLocale);

    // 2. If not found in URL, try cookies (locale field)
    if (!detectedLang) {
      const cookieLang = this.getCookie('locale');
      detectedLang = this.normalizeLanguage(cookieLang);
    }

    // 3. If not found in cookies, try localStorage
    if (!detectedLang) {
      const savedLang = localStorageGetItem('document-lang') as Language;
      if (
        savedLang &&
        (savedLang === LanguageCode.ZH || savedLang === LanguageCode.EN || savedLang === LanguageCode.ZH_TW)
      ) {
        detectedLang = savedLang;
      }
    }

    // 3b. Fall back to the homepage's explicitly chosen language (`ran-lang`,
    //     written by the homepage language switcher / auto-detect). Without this
    //     the editor would boot from the browser's zh locale even after the user
    //     explicitly picked English, so opening a doc would show a Chinese UI.
    if (!detectedLang) {
      const homepageLang = localStorageGetItem('ran-lang');
      if (homepageLang) detectedLang = this.normalizeLanguage(homepageLang);
    }

    // 4. If not found in localStorage, try navigator.language
    if (!detectedLang) {
      const browserLang =
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        typeof navigator !== 'undefined' && navigator.language
          ? // eslint-disable-next-line n/no-unsupported-features/node-builtins
            navigator.language
          : LanguageCode.EN;
      detectedLang = this.normalizeLanguage(browserLang);
    }

    // 5. Default to 'en' if nothing found
    this.currentLanguage = detectedLang || LanguageCode.EN;
  }

  /**
   * Get current language
   */
  getLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * Set language
   */
  setLanguage(lang: Language): void {
    if (lang === LanguageCode.ZH || lang === LanguageCode.EN || lang === LanguageCode.ZH_TW) {
      this.currentLanguage = lang;
      localStorageSetItem('document-lang', lang);
      // Trigger language change event
      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      window.dispatchEvent(new CustomEvent('languagechange', { detail: { language: lang } }));
    }
  }

  /**
   * Get translated text
   */
  t(key: keyof I18nMessages): string {
    return messages[this.currentLanguage][key] || messages[LanguageCode.EN][key] || key;
  }

  /**
   * Get all messages
   */
  getMessages(): I18nMessages {
    return messages[this.currentLanguage];
  }

  /**
   * Get OnlyOffice language code (BCP 47 standard)
   * OnlyOffice uses BCP 47 standard language codes
   * - English: 'en'
   * - Simplified Chinese (Mainland China): 'zh-CN'
   * - Traditional Chinese (Taiwan): 'zh-TW'
   */
  getOnlyOfficeLang(): string {
    // Mapping from internal language code to OnlyOffice BCP 47 standard code
    const langMap: Record<Language, OnlyOfficeLanguageCode> = {
      [LanguageCode.ZH]: OnlyOfficeLanguageCode.ZH_CN,
      [LanguageCode.ZH_TW]: OnlyOfficeLanguageCode.ZH_TW,
      [LanguageCode.EN]: OnlyOfficeLanguageCode.EN,
    };
    return langMap[this.currentLanguage] || OnlyOfficeLanguageCode.EN;
  }
}

// Export singleton
export const i18n = new I18n();

// Export convenience functions
export const t = (key: keyof I18nMessages): string => i18n.t(key);
export const getLanguage = (): Language => i18n.getLanguage();
export const setLanguage = (lang: Language): void => i18n.setLanguage(lang);
export const getOnlyOfficeLang = (): string => i18n.getOnlyOfficeLang();
