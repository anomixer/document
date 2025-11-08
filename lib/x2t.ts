import { getExtensions } from 'ranuts/utils';
import 'ranui/message';
import { g_sEmpty_bin } from './empty_bin';
import { getDocmentObj } from '@/store';

declare global {
  interface Window {
    Module: EmscriptenModule;
    editor?: {
      sendCommand: ({
        command,
        data,
      }: {
        command: string;
        data: {
          err_code?: number;
          urls?: Record<string, string>;
          path?: string;
          imgName?: string;
          buf?: ArrayBuffer;
          success?: boolean;
          error?: string;
        };
      }) => void;
      destroyEditor: () => void;
    };
  }
}

// types/x2t.d.ts - 型別定義檔案
interface EmscriptenFileSystem {
  mkdir(path: string): void;
  readdir(path: string): string[];
  readFile(path: string, options?: { encoding: 'binary' }): BlobPart;
  writeFile(path: string, data: Uint8Array | string): void;
}

interface EmscriptenModule {
  FS: EmscriptenFileSystem;
  ccall: (funcName: string, returnType: string, argTypes: string[], args: any[]) => number;
  onRuntimeInitialized: () => void;
}

interface ConversionResult {
  fileName: string;
  type: DocumentType;
  bin: BlobPart;
  media: Record<string, string>;
}

interface BinConversionResult {
  fileName: string;
  data: BlobPart;
}

type DocumentType = 'word' | 'cell' | 'slide';

/**
 * X2T 工具類 - 負責文件轉換功能
 */
class X2TConverter {
  private x2tModule: EmscriptenModule | null = null;
  private isReady = false;
  private initPromise: Promise<EmscriptenModule> | null = null;
  private hasScriptLoaded = false;

  // 支援的檔案型別對映
  private readonly DOCUMENT_TYPE_MAP: Record<string, DocumentType> = {
    docx: 'word',
    doc: 'word',
    odt: 'word',
    rtf: 'word',
    txt: 'word',
    xlsx: 'cell',
    xls: 'cell',
    ods: 'cell',
    csv: 'cell',
    pptx: 'slide',
    ppt: 'slide',
    odp: 'slide',
  };

  private readonly WORKING_DIRS = ['/working', '/working/media', '/working/fonts', '/working/themes'];
  private readonly SCRIPT_PATH = 'wasm/x2t/x2t.js';
  private readonly INIT_TIMEOUT = 300000;

  /**
   * 載入 X2T 指令碼檔案
   */
  async loadScript(): Promise<void> {
    if (this.hasScriptLoaded) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.SCRIPT_PATH;
      script.onload = () => {
        this.hasScriptLoaded = true;
        console.log('X2T WASM script loaded successfully');
        resolve();
      };

      script.onerror = (error) => {
        const errorMsg = 'Failed to load X2T WASM script';
        console.error(errorMsg, error);
        reject(new Error(errorMsg));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * 初始化 X2T 模組
   */
  async initialize(): Promise<EmscriptenModule> {
    if (this.isReady && this.x2tModule) {
      return this.x2tModule;
    }

    // 防止重複初始化
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<EmscriptenModule> {
    try {
      await this.loadScript();
      return new Promise((resolve, reject) => {
        const x2t = window.Module;
        if (!x2t) {
          reject(new Error('X2T module not found after script loading'));
          return;
        }

        // 設定超時處理
        const timeoutId = setTimeout(() => {
          if (!this.isReady) {
            reject(new Error(`X2T initialization timeout after ${this.INIT_TIMEOUT}ms`));
          }
        }, this.INIT_TIMEOUT);

        x2t.onRuntimeInitialized = () => {
          try {
            clearTimeout(timeoutId);
            this.createWorkingDirectories(x2t);
            this.x2tModule = x2t;
            this.isReady = true;
            console.log('X2T module initialized successfully');
            resolve(x2t);
          } catch (error) {
            reject(error);
          }
        };
      });
    } catch (error) {
      this.initPromise = null; // 重置以允許重試
      throw error;
    }
  }

  /**
   * 建立工作目錄
   */
  private createWorkingDirectories(x2t: EmscriptenModule): void {
    this.WORKING_DIRS.forEach((dir) => {
      try {
        x2t.FS.mkdir(dir);
      } catch (error) {
        // 目錄可能已存在，忽略錯誤
        console.warn(`Directory ${dir} may already exist:`, error);
      }
    });
  }

  /**
   * 獲取文件型別
   */
  private getDocumentType(extension: string): DocumentType {
    const docType = this.DOCUMENT_TYPE_MAP[extension.toLowerCase()];
    if (!docType) {
      throw new Error(`Unsupported file format: ${extension}`);
    }
    return docType;
  }

  /**
   * 清理檔名
   */
  private sanitizeFileName(input: string): string {
    if (typeof input !== 'string' || !input.trim()) {
      return 'file.bin';
    }

    const parts = input.split('.');
    const ext = parts.pop() || 'bin';
    const name = parts.join('.');

    const illegalChars = /[/?<>\\:*|"]/g;
    // eslint-disable-next-line no-control-regex
    const controlChars = /[\x00-\x1f\x80-\x9f]/g;
    const reservedPattern = /^\.+$/;
    const unsafeChars = /[&'%!"{}[\]]/g;

    let sanitized = name
      .replace(illegalChars, '')
      .replace(controlChars, '')
      .replace(reservedPattern, '')
      .replace(unsafeChars, '');

    sanitized = sanitized.trim() || 'file';
    return `${sanitized.slice(0, 200)}.${ext}`; // 限制長度
  }

  /**
   * 執行文件轉換
   */
  private executeConversion(paramsPath: string): void {
    if (!this.x2tModule) {
      throw new Error('X2T module not initialized');
    }

    const result = this.x2tModule.ccall('main1', 'number', ['string'], [paramsPath]);
    if (result !== 0) {
      throw new Error(`Conversion failed with code: ${result}`);
    }
  }

  /**
   * 建立轉換引數 XML
   */
  private createConversionParams(fromPath: string, toPath: string, additionalParams = ''): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<TaskQueueDataConvert xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <m_sFileFrom>${fromPath}</m_sFileFrom>
  <m_sThemeDir>/working/themes</m_sThemeDir>
  <m_sFileTo>${toPath}</m_sFileTo>
  <m_bIsNoBase64>false</m_bIsNoBase64>
  ${additionalParams}
</TaskQueueDataConvert>`;
  }

  /**
   * 讀取媒體檔案
   */
  private readMediaFiles(): Record<string, string> {
    if (!this.x2tModule) return {};

    const media: Record<string, string> = {};

    try {
      const files = this.x2tModule.FS.readdir('/working/media/');

      files
        .filter((file) => file !== '.' && file !== '..')
        .forEach((file) => {
          try {
            const fileData = this.x2tModule!.FS.readFile(`/working/media/${file}`, {
              encoding: 'binary',
            }) as BlobPart;

            const blob = new Blob([fileData]);
            const mediaUrl = window.URL.createObjectURL(blob);
            media[`media/${file}`] = mediaUrl;
          } catch (error) {
            console.warn(`Failed to read media file ${file}:`, error);
          }
        });
    } catch (error) {
      console.warn('Failed to read media directory:', error);
    }

    return media;
  }

  /**
   * 將文件轉換為 bin 格式
   */
  async convertDocument(file: File): Promise<ConversionResult> {
    await this.initialize();

    const fileName = file.name;
    const fileExt = getExtensions(file?.type)[0] || fileName.split('.').pop() || '';
    const documentType = this.getDocumentType(fileExt);

    try {
      // 讀取檔案內容
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      // 生成安全的檔名
      const sanitizedName = this.sanitizeFileName(fileName);
      const inputPath = `/working/${sanitizedName}`;
      const outputPath = `${inputPath}.bin`;

      // 寫入檔案到虛擬檔案系統
      this.x2tModule!.FS.writeFile(inputPath, data);

      // 建立轉換引數
      const params = this.createConversionParams(inputPath, outputPath);
      this.x2tModule!.FS.writeFile('/working/params.xml', params);

      // 執行轉換
      this.executeConversion('/working/params.xml');

      // 讀取轉換結果
      const result = this.x2tModule!.FS.readFile(outputPath);
      const media = this.readMediaFiles();

      return {
        fileName: sanitizedName,
        type: documentType,
        bin: result,
        media,
      };
    } catch (error) {
      throw new Error(`Document conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 將 bin 格式轉換為指定格式並下載
   */
  async convertBinToDocumentAndDownload(
    bin: Uint8Array,
    originalFileName: string,
    targetExt = 'DOCX',
  ): Promise<BinConversionResult> {
    await this.initialize();

    const sanitizedBase = this.sanitizeFileName(originalFileName).replace(/\.[^/.]+$/, '');
    const binFileName = `${sanitizedBase}.bin`;
    const outputFileName = `${sanitizedBase}.${targetExt.toLowerCase()}`;

    try {
      // 寫入 bin 檔案
      this.x2tModule!.FS.writeFile(`/working/${binFileName}`, bin);

      // 建立轉換引數
      let additionalParams = '';
      if (targetExt === 'PDF') {
        additionalParams = '<m_sFontDir>/working/fonts/</m_sFontDir>';
      }

      const params = this.createConversionParams(
        `/working/${binFileName}`,
        `/working/${outputFileName}`,
        additionalParams,
      );

      this.x2tModule!.FS.writeFile('/working/params.xml', params);

      // 執行轉換
      this.executeConversion('/working/params.xml');

      // 讀取生成的文件
      const result = this.x2tModule!.FS.readFile(`/working/${outputFileName}`);

      // 確保 result 是 Uint8Array 型別
      const resultArray = result instanceof Uint8Array ? result : new Uint8Array(result as ArrayBuffer);

      // 下載檔案
      // TODO: 完善列印功能
      this.saveWithFileSystemAPI(resultArray, outputFileName);

      return {
        fileName: outputFileName,
        data: result,
      };
    } catch (error) {
      throw new Error(`Bin to document conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 下載檔案
   */
  private downloadFile(data: Uint8Array, fileName: string): void {
    const blob = new Blob([data as BlobPart]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // 清理資源
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * 根據副檔名獲取 MIME 型別
   */
  private getMimeTypeFromExtension(extension: string): string {
    const mimeMap: Record<string, string> = {
      // 文件型別
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      odt: 'application/vnd.oasis.opendocument.text',
      rtf: 'application/rtf',
      txt: 'text/plain',
      pdf: 'application/pdf',

      // 表格型別
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      ods: 'application/vnd.oasis.opendocument.spreadsheet',
      csv: 'text/csv',

      // 簡報型別
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ppt: 'application/vnd.ms-powerpoint',
      odp: 'application/vnd.oasis.opendocument.presentation',

      // 圖片型別
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };

    return mimeMap[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * 獲取檔案型別描述
   */
  private getFileDescription(extension: string): string {
    const descriptionMap: Record<string, string> = {
      docx: 'Word Document',
      doc: 'Word 97-2003 Document',
      odt: 'OpenDocument Text',
      pdf: 'PDF Document',
      xlsx: 'Excel Workbook',
      xls: 'Excel 97-2003 Workbook',
      ods: 'OpenDocument Spreadsheet',
      pptx: 'PowerPoint Presentation',
      ppt: 'PowerPoint 97-2003 Presentation',
      odp: 'OpenDocument Presentation',
      txt: 'Text Document',
      rtf: 'Rich Text Format',
      csv: 'CSV File',
    };

    return descriptionMap[extension.toLowerCase()] || 'Document';
  }

  /**
   * 使用現代檔案系統 API 儲存檔案
   */
  private async saveWithFileSystemAPI(data: Uint8Array, fileName: string, mimeType?: string): Promise<void> {
    if (!(window as any).showSaveFilePicker) {
      this.downloadFile(data, fileName);
      return;
    }
    try {
      // 獲取副檔名並確定 MIME 型別
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      const detectedMimeType = mimeType || this.getMimeTypeFromExtension(extension);

      // 顯示檔案儲存對話方塊
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: this.getFileDescription(extension),
            accept: {
              [detectedMimeType]: [`.${extension}`],
            },
          },
        ],
      });

      // 建立可寫流並寫入資料
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      window?.message?.success?.(`檔案儲存成功：${fileName}`);
      console.log('File saved successfully:', fileName);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('User cancelled the save operation');
        return;
      }
      throw error;
    }
  }

  /**
   * 銷燬例項，清理資源
   */
  destroy(): void {
    this.x2tModule = null;
    this.isReady = false;
    this.initPromise = null;
    console.log('X2T converter destroyed');
  }
}

export function loadEditorApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    // 檢查是否已載入
    if (window.DocsAPI) {
      resolve();
      return;
    }

    // 載入編輯器 API
    const script = document.createElement('script');
    script.src = './web-apps/apps/api/documents/api.js';
    script.onload = () => resolve();
    script.onerror = (error) => {
      console.error('Failed to load OnlyOffice API:', error);
      alert('無法載入編輯器元件。請確保已正確安裝 OnlyOffice API。');
      reject(error);
    };
    document.head.appendChild(script);
  });
}

// 單例例項
const x2tConverter = new X2TConverter();
export const loadScript = (): Promise<void> => x2tConverter.loadScript();
export const initX2T = (): Promise<EmscriptenModule> => x2tConverter.initialize();
export const convertDocument = (file: File): Promise<ConversionResult> => x2tConverter.convertDocument(file);
export const convertBinToDocumentAndDownload = (
  bin: Uint8Array,
  fileName: string,
  targetExt?: string,
): Promise<BinConversionResult> => x2tConverter.convertBinToDocumentAndDownload(bin, fileName, targetExt);

// 檔案型別常量
export const oAscFileType = {
  UNKNOWN: 0,
  PDF: 513,
  PDFA: 521,
  DJVU: 515,
  XPS: 516,
  DOCX: 65,
  DOC: 66,
  ODT: 67,
  RTF: 68,
  TXT: 69,
  HTML: 70,
  MHT: 71,
  EPUB: 72,
  FB2: 73,
  MOBI: 74,
  DOCM: 75,
  DOTX: 76,
  DOTM: 77,
  FODT: 78,
  OTT: 79,
  DOC_FLAT: 80,
  DOCX_FLAT: 81,
  HTML_IN_CONTAINER: 82,
  DOCX_PACKAGE: 84,
  OFORM: 85,
  DOCXF: 86,
  DOCY: 4097,
  CANVAS_WORD: 8193,
  JSON: 2056,
  XLSX: 257,
  XLS: 258,
  ODS: 259,
  CSV: 260,
  XLSM: 261,
  XLTX: 262,
  XLTM: 263,
  XLSB: 264,
  FODS: 265,
  OTS: 266,
  XLSX_FLAT: 267,
  XLSX_PACKAGE: 268,
  XLSY: 4098,
  PPTX: 129,
  PPT: 130,
  ODP: 131,
  PPSX: 132,
  PPTM: 133,
  PPSM: 134,
  POTX: 135,
  POTM: 136,
  FODP: 137,
  OTP: 138,
  PPTX_PACKAGE: 139,
  IMG: 1024,
  JPG: 1025,
  TIFF: 1026,
  TGA: 1027,
  GIF: 1028,
  PNG: 1029,
  EMF: 1030,
  WMF: 1031,
  BMP: 1032,
  CR2: 1033,
  PCX: 1034,
  RAS: 1035,
  PSD: 1036,
  ICO: 1037,
} as const;

export const c_oAscFileType2 = Object.fromEntries(
  Object.entries(oAscFileType).map(([key, value]) => [value, key]),
) as Record<number, keyof typeof oAscFileType>;

interface SaveEvent {
  data: {
    data: {
      data: Uint8Array;
    };
    option: {
      outputformat: number;
    };
  };
}

async function handleSaveDocument(event: SaveEvent) {
  console.log('Save document event:', event);

  if (event.data && event.data.data) {
    const { data, option } = event.data;
    const { fileName } = getDocmentObj() || {};
    // 建立下載
    await convertBinToDocumentAndDownload(data.data, fileName, c_oAscFileType2[option.outputformat]);
  }

  // 告知編輯器儲存完成
  window.editor?.sendCommand({
    command: 'asc_onSaveCallback',
    data: { err_code: 0 },
  });
}

/**
 * 根據副檔名獲取 MIME 型別
 * @param extension - 副檔名
 * @returns string - MIME 型別
 */
function getMimeTypeFromExtension(extension: string): string {
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    tiff: 'image/tiff',
    tif: 'image/tiff',
  };

  return mimeMap[extension?.toLowerCase()] || 'image/png';
}

// 獲取文件型別
export function getDocumentType(fileType: string): string | null {
  const type = fileType.toLowerCase();
  if (type === 'docx' || type === 'doc') {
    return 'word';
  } else if (type === 'xlsx' || type === 'xls') {
    return 'cell';
  } else if (type === 'pptx' || type === 'ppt') {
    return 'slide';
  }
  return null;
}
// 全域性 media 對映物件
const media: Record<string, string> = {};
/**
 * 處理檔案寫入請求（主要用於處理貼上的圖片）
 * @param event - OnlyOffice 編輯器的檔案寫入事件
 */
function handleWriteFile(event: any) {
  try {
    console.log('Write file event:', event);

    const { data: eventData } = event;
    if (!eventData) {
      console.warn('No data provided in writeFile event');
      return;
    }

    const {
      data: imageData, // Uint8Array 圖片資料
      file: fileName, // 檔名，如 "display8image-174799443357-0.png"
      _target, // 目標物件，包含 frameOrigin 等資訊
    } = eventData;

    // 驗證資料
    if (!imageData || !(imageData instanceof Uint8Array)) {
      throw new Error('Invalid image data: expected Uint8Array');
    }

    if (!fileName || typeof fileName !== 'string') {
      throw new Error('Invalid file name');
    }

    // 從檔名中提取副檔名
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'png';
    const mimeType = getMimeTypeFromExtension(fileExtension);

    // 建立 Blob 物件
    const blob = new Blob([imageData as unknown as BlobPart], { type: mimeType });

    // 建立物件 URL
    const objectUrl = window.URL.createObjectURL(blob);
    // 將圖片 URL 新增到媒體對映中，使用原始檔名作為 key
    media[`media/${fileName}`] = objectUrl;
    window.editor?.sendCommand({
      command: 'asc_setImageUrls',
      data: {
        urls: media,
      },
    });

    window.editor?.sendCommand({
      command: 'asc_writeFileCallback',
      data: {
        // 圖片 base64
        path: objectUrl,
        imgName: fileName,
      },
    });
    console.log(`Successfully processed image: ${fileName}, URL: ${media}`);
  } catch (error) {
    console.error('Error handling writeFile:', error);

    // 通知編輯器檔案處理失敗
    if (window.editor && typeof window.editor.sendCommand === 'function') {
      window.editor.sendCommand({
        command: 'asc_writeFileCallback',
        data: {
          success: false,
          error: error.message,
        },
      });
    }

    if (event.callback && typeof event.callback === 'function') {
      event.callback({
        success: false,
        error: error.message,
      });
    }
  }
}

// 公共編輯器建立方法
function createEditorInstance(config: {
  fileName: string;
  fileType: string;
  binData: ArrayBuffer | string;
  media?: any;
}) {
  // 清理舊編輯器例項
  if (window.editor) {
    window.editor.destroyEditor();
    window.editor = undefined;
  }

  const { fileName, fileType, binData, media } = config;

  window.editor = new window.DocsAPI.DocEditor('iframe', {
    document: {
      title: fileName,
      url: fileName, // 使用檔名作為標識
      fileType: fileType,
      permissions: {
        edit: true,
        chat: false,
        protect: false,
      },
    },
    editorConfig: {
      lang: window.navigator.language,
      customization: {
        help: false,
        about: false,
        hideRightMenu: true,
        features: {
          spellcheck: {
            change: false,
          },
        },
        anonymous: {
          request: false,
          label: 'Guest',
        },
      },
    },
    events: {
      onAppReady: () => {
        // 設定媒體資源
        if (media) {
          window.editor?.sendCommand({
            command: 'asc_setImageUrls',
            data: { urls: media },
          });
        }

        // 載入文件內容
        window.editor?.sendCommand({
          command: 'asc_openDocument',
          // @ts-expect-error binData type is handled by the editor
          data: { buf: binData },
        });
      },
      onDocumentReady: () => {
        console.log('文件載入完成：', fileName);
      },
      onSave: handleSaveDocument,
      // writeFile
      // todo writeFile 當外部貼上圖片時候處理
      writeFile: handleWriteFile,
    },
  });
}

// 合併後的檔案操作方法
export async function handleDocumentOperation(options: {
  isNew: boolean;
  fileName: string;
  file?: File;
}): Promise<void> {
  try {
    const { isNew, fileName, file } = options;
    const fileType = getExtensions(file?.type || '')[0] || fileName.split('.').pop() || '';
    const _docType = getDocumentType(fileType);

    // 獲取文件內容
    let documentData: {
      bin: ArrayBuffer | string;
      media?: any;
    };

    if (isNew) {
      // 新建文件使用空模板
      const emptyBin = g_sEmpty_bin[`.${fileType}`];
      if (!emptyBin) {
        throw new Error(`不支援的檔案型別：${fileType}`);
      }
      documentData = { bin: emptyBin };
    } else {
      // 開啟現有文件需要轉換
      if (!file) throw new Error('無效的檔案物件');
      // @ts-expect-error convertDocument handles the file type conversion
      documentData = await convertDocument(file);
    }

    // 建立編輯器例項
    createEditorInstance({
      fileName,
      fileType,
      binData: documentData.bin,
      media: documentData.media,
    });
  } catch (error: any) {
    console.error('文件操作失敗：', error);
    alert(`文件操作失敗：${error.message}`);
    throw error;
  }
}
