# マニピュレーター

`@pdfme/manipulator`パッケージはPDFファイルを操作するための強力なユーティリティを提供します。Node.jsとブラウザ環境の両方で使用できます。

## インストール

```bash
npm install @pdfme/manipulator
```

## 機能

### merge（結合）
複数のPDFファイルを1つのPDFに結合します。位置指定が可能です。

```ts
import { merge } from '@pdfme/manipulator';

const pdf1 = new ArrayBuffer(...); // 1つ目のPDF
const pdf2 = new ArrayBuffer(...); // 2つ目のPDF

// 基本的な結合（末尾に追加）
const merged = await merge([pdf1, pdf2]);

// 先頭に結合
const mergedAtStart = await merge([pdf1, pdf2], { position: 'start' });

// 特定の位置に結合
const mergedAtIndex = await merge([pdf1, pdf2], { position: 1 });
```

### mergeAdvanced（高度な結合）
PDFとテンプレートを組み合わせて1つのPDFに結合します。

```ts
import { mergeAdvanced, MergeItem } from '@pdfme/manipulator';

const pdf1 = new ArrayBuffer(...); // PDFファイル
const template = { 
  basePdf: BLANK_PDF, 
  schemas: [/* テンプレート定義 */] 
};

const items: MergeItem[] = [
  { type: 'pdf', data: pdf1, pages: [0, 2] }, // 1ページ目と3ページ目のみ
  { 
    type: 'template', 
    data: template, 
    inputs: [{ field1: 'value1' }] 
  }
];

// 末尾に結合（デフォルト）
const result = await mergeAdvanced(items);

// 特定の位置に結合
const resultAtIndex = await mergeAdvanced(items, { position: 1 });
```

### mergeWithTemplates（テンプレートとの結合）
ベースPDFに複数のテンプレートを指定された位置に結合します。

```ts
import { mergeWithTemplates } from '@pdfme/manipulator';

const basePdf = new ArrayBuffer(...);
const template1 = { /* テンプレート定義 */ };
const template2 = { /* テンプレート定義 */ };

const result = await mergeWithTemplates(basePdf, [
  { 
    template: template1, 
    inputs: [{ title: 'ページ1' }], 
    position: 0 // 先頭に挿入
  },
  { 
    template: template2, 
    inputs: [{ title: 'ページ2' }], 
    position: 'end' // 末尾に追加
  }
]);
```

### split（分割）
PDFをページ範囲に基づいて複数のPDFに分割します。

```ts
import { split } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // ソースPDF
const splits = await split(pdf, [
  { start: 0, end: 1 }, // 1-2ページ
  { start: 2, end: 4 }, // 3-5ページ
]);
```

### rotate（回転）
PDFの指定されたページを回転させます。

```ts
import { rotate } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // ソースPDF
const result = await rotate(pdf, 90); // すべてのページを90度回転
// または特定のページを回転：
const result2 = await rotate(pdf, 90, [0, 2]); // 1ページ目と3ページ目を回転
```

### insert（挿入）
指定された位置にPDFページを挿入します。

```ts
import { insert } from '@pdfme/manipulator';

const basePdf = new ArrayBuffer(...); // ベースPDF
const insertPdf = new ArrayBuffer(...); // 挿入するPDF
const result = await insert(basePdf, [
  { pdf: insertPdf, position: 1 } // 1ページ目の後に挿入
]);
```

### remove（削除）
PDFから指定されたページを削除します。

```ts
import { remove } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // ソースPDF
const result = await remove(pdf, [1, 3]); // 2ページ目と4ページ目を削除
```

### move（移動）
PDFの中で1つのページを別の位置に移動します。

```ts
import { move } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // ソースPDF
const result = await move(pdf, { from: 0, to: 2 }); // 1ページ目を3番目の位置に移動
```

### organize（整理）
複数のPDF操作を順番に実行します。

```ts
import { organize } from '@pdfme/manipulator';

const pdf = new ArrayBuffer(...); // ソースPDF
const insertPdf = new ArrayBuffer(...); // 挿入するPDF
const result = await organize(pdf, [
  { type: 'remove', data: { position: 1 } },
  { type: 'insert', data: { pdf: insertPdf, position: 0 } },
  { type: 'rotate', data: { position: 0, degrees: 90 } },
]);
```

## エラー処理

無効なパラメータが提供された場合、すべての関数は説明的なエラーをスローします：

- 無効なページ番号: `[@pdfme/manipulator] Invalid page number`
- 無効な回転角度: `[@pdfme/manipulator] Rotation degrees must be a multiple of 90`
- 無効な位置: `[@pdfme/manipulator] Invalid position`
- 空の入力: `[@pdfme/manipulator] At least one PDF is required`

## 型定義

```ts
type PDFInput = ArrayBuffer;

interface PageRange {
  start?: number;
  end?: number;
}

interface InsertOperation {
  pdf: PDFInput;
  position: number;
}

type OrganizeAction =
  | { type: 'remove'; data: { position: number } }
  | { type: 'insert'; data: { pdf: PDFInput; position: number } }
  | { type: 'replace'; data: { pdf: PDFInput; position: number } }
  | { type: 'rotate'; data: { position: number; degrees: 0 | 90 | 180 | 270 | 360 } }
  | { type: 'move'; data: { from: number; to: number } };
```

## お問い合わせ

`@pdfme/manipulator`に関するご質問やご提案がありましたら、以下までご連絡ください：

- **Discord**: [https://discord.gg/xWPTJbmgNV](https://discord.gg/xWPTJbmgNV)
- **GitHub Issues**: [https://github.com/pdfme/pdfme/issues](https://github.com/pdfme/pdfme/issues)
