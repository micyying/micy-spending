const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

function appRules() {
  const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  const script = [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((source) => source.includes("const KEY='micy-hua-zai-na-ledger-v1'"));
  const cut = script.indexOf("$('pdf-files').onchange");
  const source = `${script.slice(0, cut)}\nglobalThis.MicyTest={monthFromFilename,normalize,migrateLedger,categoryFor,groupedRebates};\n})();`;
  const memory = new Map();
  const context = {
    console,
    Date,
    Intl,
    localStorage: {
      getItem: (key) => memory.get(key) || null,
      setItem: (key, value) => memory.set(key, value),
    },
  };
  vm.runInNewContext(source, context);
  return context.MicyTest;
}

test('statement filenames control fallback months and Go card variants', () => {
  const rules = appRules();
  assert.equal(rules.monthFromFilename('go卡2026年08月（鑽石）.pdf'), '2026-08');
  assert.equal(rules.monthFromFilename('YING-YANG_7月2026_Mox_Credit_Statement.pdf'), '2026-07');

  const diamond = rules.normalize(
    {
      meta: { bank: 'boc', card_type: 'go_diamond', statement_month: '2026-08' },
      rows: [{ transaction_type: 'odd_cent', merchant: 'ODD CENTS TO NEXT BILL', amount: 0.12, date: '2026-08-18', currency: 'HKD', cardId: 'card-boc-go-dia' }],
      warnings: [],
    },
    'go卡2026年08月（鑽石）.pdf',
    'diamond'
  );
  assert.equal(diamond.transactions[0].product, '中銀 Go 鑽石卡');
  assert.equal(diamond.transactions[0].transactionDate, '2026-08');

  const platinum = rules.normalize(
    {
      meta: { bank: 'boc', card_type: 'go_platinum', statement_month: '2026-07' },
      rows: [{ transaction_type: 'purchase', merchant: 'SHOP', amount: 1, transaction_date: '2026-07-01', currency: 'HKD', cardId: 'card-boc-go' }],
      warnings: [],
    },
    'go卡2026年07月.pdf',
    'platinum'
  );
  assert.equal(platinum.transactions[0].product, '中銀 Go 白金卡');
});

test('AEON cards stay separate and WAKU coin redemption is a rebate', () => {
  const rules = appRules();
  const statement = rules.normalize(
    {
      meta: { bank: 'aeon', card_type: 'aeon', statement_month: '2026-07' },
      rows: [
        { transaction_type: 'reward_offset', merchant: 'WAKU COIN REDEMPTION', amount: 200, raw_amount: '200.00 CR', credit_debit_indicator: 'CR', currency: 'HKD', cardId: 'card-aeon-waku' },
        { transaction_type: 'purchase', merchant: 'SHOP', amount: 50, raw_amount: '50.00', credit_debit_indicator: 'DEBIT', currency: 'HKD', cardId: 'card-aeon-purple' },
      ],
      warnings: [],
    },
    'Aeon 2026年7月.pdf',
    'aeon'
  );
  assert.deepEqual(
    statement.transactions.map((row) => row.product),
    ['AEON Wakuwaku', 'AEON Purple Card']
  );
  assert.equal(statement.transactions[0].kind, 'rebate');
  assert.equal(statement.transactions[0].amount, 200);
});

test('Cathay dates use the statement month', () => {
  const rules = appRules();
  const statement = rules.normalize(
    {
      meta: { bank: 'sc', card_type: 'cathay', statement_month: '2026-06' },
      rows: [{ transaction_type: 'purchase', merchant: 'SHOP', amount: 50, transaction_date: '2026-06-30', currency: 'HKD', cardId: 'card-sc-cathay' }],
      warnings: [],
    },
    '渣打國泰 2026年7月.pdf',
    'cathay'
  );
  assert.equal(statement.transactions[0].transactionDate, '2026-07');
});

test('rebate total excludes repayments and refunds', () => {
  const rules = appRules();
  const total = rules.groupedRebates([
    { amount: 5, currency: 'HKD', kind: 'rebate' },
    { amount: 100, currency: 'HKD', kind: 'payment' },
    { amount: 20, currency: 'HKD', kind: 'refund' },
  ]);
  assert.match(total, /5\.00/);
  assert.doesNotMatch(total, /125\.00/);
});

test('requested spending categories are assigned', () => {
  const rules = appRules();
  const classify = (description, currency = 'HKD', paymentMethod = null) =>
    rules.categoryFor({ amount: -1, description, currency, paymentMethod, category: '' });
  assert.equal(classify('MTR MOBILE'), '交通費');
  assert.equal(classify('RENTSMART HKG'), 'RentSmart');
  assert.equal(classify('OCTOPUS TOP UP'), '八達通增值');
  assert.equal(classify('LOCAL SHOP', 'JPY'), '海外實體－日韓泰');
  assert.equal(classify('LOCAL SHOP', 'CNY'), '海外實體－中國內地');
  assert.equal(classify('SHOP APPLE PAY', 'HKD', 'apple_pay'), 'ApplePay');
});
