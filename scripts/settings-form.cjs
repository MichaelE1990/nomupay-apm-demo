// Builds public/downloads/pay-by-bank-settings-form.docx: the Pay by Bank account settings
// (the same list as src/components/OpenBankingSettings.jsx) as a form to fill in.
// Needs the docx package: npm i --no-save docx && node scripts/settings-form.cjs
const fs = require('fs')
const path = require('path')
const {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} = require('docx')

const NAVY = '172147'
const BLUE = '0190F7'
const GREY = '6B7280'
const LINE = 'DADDE7'
const TINT = 'F6F6F8'
const FONT = 'Arial'

const SALES = 'sales@nomupay.com'
const SUPPORT = 'support@nomupay.com'

// A4 with 1 inch margins: 9026 DXA of text width
const COLS = [2300, 3526, 3200]
const WIDTH = COLS.reduce((a, b) => a + b, 0)

const text = (t, o = {}) => new TextRun({ text: t, font: FONT, ...o })
const hint = (t) => new Paragraph({ spacing: { after: 60 }, children: [text(t, { size: 18, color: GREY })] })
const box = (label) =>
  new Paragraph({
    spacing: { after: 60 },
    // A plain box, not a Word checkbox control: those draw wrongly in LibreOffice and some viewers
    children: [text('\u2610', { font: 'Segoe UI Symbol', size: 22 }), text(`  ${label}`, { size: 20 })],
  })
const blank = () => new Paragraph({ children: [text('', { size: 20 })] })
const mail = (address) =>
  new ExternalHyperlink({ link: `mailto:${address}`, children: [text(address, { color: BLUE, underline: {} })] })

// Each setting: its name, what we need, and the answer cell's content
const GROUPS = [
  {
    title: 'Your business',
    rows: [
      ['Business name', 'Your business’s legal name.', [blank()]],
      ['Display name', 'The name shoppers see when they pay, on the page where they choose their bank.', [blank()]],
      ['Logo', 'Shown to shoppers when they choose Pay by Bank.', [hint('Send your logo as an image file with this form.')]],
      ['Domain name', 'The full address of the website you take payments on, such as https://www.mysite.co.uk/.', [blank()]],
    ],
  },
  {
    title: 'Your payouts',
    rows: [
      ['Currencies', 'GBP, EUR or both.', [box('GBP'), box('EUR')]],
      [
        'Account details',
        'Where we pay your funds: an account number and sort code for GBP, an IBAN for EUR.',
        [hint('GBP account number:'), blank(), hint('Sort code:'), blank(), hint('EUR IBAN:'), blank()],
      ],
    ],
  },
  {
    title: 'Your checkout',
    rows: [
      ['Integration type', 'Pay by link from your Nomupay Dashboard, or the API.', [box('Pay by link'), box('API')]],
      ['Pay by link payment methods', 'Pay by Bank only, or Pay by Bank and cards. For Pay by links only.', [box('Pay by Bank only'), box('Pay by Bank and cards')]],
      ['Default country', 'The country already selected when the shopper starts paying.', [blank()]],
      ['Destination countries', 'The countries shoppers can pay from.', [blank()]],
    ],
  },
]

const border = { style: BorderStyle.SINGLE, size: 4, color: LINE }
const borders = { top: border, bottom: border, left: border, right: border }
const margins = { top: 100, bottom: 100, left: 120, right: 120 }

function cell(children, width, shade) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    margins,
    verticalAlign: VerticalAlign.TOP,
    shading: shade ? { fill: shade, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    children,
  })
}

function headerRow() {
  return new TableRow({
    tableHeader: true,
    children: ['Setting', 'What we need', 'Your answer'].map((h, i) =>
      cell([new Paragraph({ children: [text(h, { bold: true, size: 18, color: 'FFFFFF' })] })], COLS[i], NAVY),
    ),
  })
}

function settingRow([name, need, answer]) {
  return new TableRow({
    cantSplit: true,
    height: { value: 560, rule: 'atLeast' },
    children: [
      cell([new Paragraph({ children: [text(name, { bold: true, size: 20, color: NAVY })] })], COLS[0], TINT),
      cell([new Paragraph({ children: [text(need, { size: 20 })] })], COLS[1]),
      cell(answer, COLS[2]),
    ],
  })
}

function group(g) {
  return [
    new Paragraph({ heading: 'Heading2', children: [text(g.title)] }),
    new Table({ width: { size: WIDTH, type: WidthType.DXA }, columnWidths: COLS, rows: [headerRow(), ...g.rows.map(settingRow)] }),
  ]
}

const logo = fs.readFileSync(path.join(__dirname, 'assets/nomupay-wordmark.png'))

const doc = new Document({
  creator: 'Nomupay',
  title: 'Pay by Bank settings form',
  description: 'The settings Nomupay configures for a Pay by Bank account',
  styles: {
    default: { document: { run: { font: FONT, size: 20, color: '1F2937' } } },
    paragraphStyles: [
      {
        id: 'Title',
        name: 'Title',
        basedOn: 'Normal',
        next: 'Normal',
        run: { font: FONT, size: 40, bold: true, color: NAVY },
        paragraph: { spacing: { before: 0, after: 120 }, keepNext: true },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        run: { font: FONT, size: 26, bold: true, color: NAVY },
        paragraph: { spacing: { before: 320, after: 120 }, keepNext: true, outlineLevel: 1 },
      },
    ],
  },
  sections: [
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1200, left: 1440, right: 1440, header: 600, footer: 500 } } },
      headers: {
        default: new Header({
          children: [new Paragraph({ children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 128, height: 21 }, altText: { title: 'Nomupay', description: 'Nomupay logo', name: 'Nomupay' } })] })],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [text('Pay by Bank settings form', { size: 16, color: GREY })],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({ style: 'Title', children: [text('Pay by Bank settings form')] }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            text('We set these up for your Pay by Bank account during onboarding. Fill in your answers and send the form to our sales team at '),
            mail(SALES),
            text(' with your application.'),
          ],
        }),
        ...GROUPS.flatMap(group),
        new Paragraph({
          spacing: { before: 360 },
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 8 } },
          children: [text('Changing a setting later? ', { bold: true, color: NAVY }), text('Email '), mail(SUPPORT), text(' with the setting you’d like to change and its new value.')],
        }),
      ],
    },
  ],
})

const out = path.join(__dirname, '../public/downloads/pay-by-bank-settings-form.docx')
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(out, buf)
  console.log('Wrote', path.relative(process.cwd(), out))
})
