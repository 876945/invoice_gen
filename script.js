/* =========================================
   INVOX — Invoice Generator Script
   ========================================= */

// ─── STATE ────────────────────────────────
let items = [];
let itemIdCounter = 0;

// ─── DOM REFS ─────────────────────────────
const $  = id => document.getElementById(id);
const fromName     = $('fromName');
const fromAddress  = $('fromAddress');
const toName       = $('toName');
const toAddress    = $('toAddress');
const invoiceNum   = $('invoiceNum');
const invoiceDate  = $('invoiceDate');
const dueDate      = $('dueDate');
const currency     = $('currency');
const taxRate      = $('taxRate');
const discountRate = $('discountRate');
const notes        = $('notes');
const lineItemsCnt = $('lineItems');

// Preview refs
const prevFromName = $('prevFromName');
const prevFromAddr = $('prevFromAddr');
const prevToName   = $('prevToName');
const prevToAddr   = $('prevToAddr');
const prevNum      = $('prevNum');
const prevDate     = $('prevDate');
const prevDue      = $('prevDue');
const prevTableBody = $('prevTableBody');
const prevSubtotal = $('prevSubtotal');
const prevDiscount = $('prevDiscount');
const prevTax      = $('prevTax');
const prevTotal    = $('prevTotal');
const discountRow  = $('discountRow');
const taxRow       = $('taxRow');
const prevNotes    = $('prevNotes');

// ─── INIT ─────────────────────────────────
function init() {
  // Set default dates
  const today = new Date();
  const due   = new Date(today);
  due.setDate(due.getDate() + 30);

  invoiceDate.value = toDateInputValue(today);
  dueDate.value     = toDateInputValue(due);

  addItem();
  addItem();

  bindAll();
  updatePreview();
}

function toDateInputValue(d) {
  return d.toISOString().slice(0, 10);
}

function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

// ─── BIND EVENTS ──────────────────────────
function bindAll() {
  [fromName, fromAddress, toName, toAddress,
   invoiceNum, invoiceDate, dueDate,
   currency, taxRate, discountRate, notes
  ].forEach(el => el.addEventListener('input', updatePreview));

  $('addItemBtn').addEventListener('click', () => { addItem(); updatePreview(); });
  $('printBtn').addEventListener('click', printInvoice);
  $('clearBtn').addEventListener('click', clearAll);
}

// ─── LINE ITEMS ────────────────────────────
function addItem() {
  const id = ++itemIdCounter;
  const item = { id, desc: '', qty: 1, rate: 0 };
  items.push(item);
  renderItemRow(item);
  updatePreview();
}

function renderItemRow(item) {
  const row = document.createElement('div');
  row.className = 'line-item';
  row.dataset.id = item.id;

  row.innerHTML = `
    <input type="text" class="field item-desc" placeholder="Service or product" value="${escHtml(item.desc)}" />
    <input type="number" class="field item-qty" value="${item.qty}" min="0" step="1" />
    <input type="number" class="field item-rate" value="${item.rate === 0 ? '' : item.rate}" placeholder="0" min="0" step="0.01" />
    <div class="item-total">—</div>
    <button class="btn-del" title="Remove">×</button>
  `;

  row.querySelector('.item-desc').addEventListener('input',  e => { item.desc = e.target.value; updatePreview(); });
  row.querySelector('.item-qty').addEventListener('input',   e => { item.qty  = parseFloat(e.target.value) || 0; recalcRow(row, item); updatePreview(); });
  row.querySelector('.item-rate').addEventListener('input',  e => { item.rate = parseFloat(e.target.value) || 0; recalcRow(row, item); updatePreview(); });
  row.querySelector('.btn-del').addEventListener('click',    () => { removeItem(item.id, row); });

  lineItemsCnt.appendChild(row);
  recalcRow(row, item);
}

function recalcRow(row, item) {
  const total = item.qty * item.rate;
  row.querySelector('.item-total').textContent = formatMoney(total);
}

function removeItem(id, row) {
  items = items.filter(i => i.id !== id);
  row.style.opacity = '0';
  row.style.transform = 'translateX(-12px)';
  row.style.transition = 'all 0.2s ease';
  setTimeout(() => { row.remove(); updatePreview(); }, 200);
}

// ─── UPDATE PREVIEW ───────────────────────
function updatePreview() {
  const sym = currency.value;

  // From / To
  prevFromName.textContent = fromName.value || 'Your Company';
  prevFromAddr.textContent = fromAddress.value;
  prevToName.textContent   = toName.value   || 'Client Name';
  prevToAddr.textContent   = toAddress.value;

  // Meta
  prevNum.textContent  = invoiceNum.value  || '—';
  prevDate.textContent = formatDate(invoiceDate.value);
  prevDue.textContent  = formatDate(dueDate.value);

  // Notes
  prevNotes.textContent = notes.value;

  // Table
  prevTableBody.innerHTML = '';

  if (items.length === 0) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    tr.innerHTML = `<td colspan="4">No items added yet</td>`;
    prevTableBody.appendChild(tr);
  } else {
    items.forEach(item => {
      if (!item.desc && item.qty === 1 && item.rate === 0) return; // skip blank
      const amt = item.qty * item.rate;
      const tr  = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-desc">${escHtml(item.desc) || '<em style="opacity:.4">Untitled item</em>'}</td>
        <td>${item.qty}</td>
        <td>${formatMoney2(item.rate, sym)}</td>
        <td class="td-amount">${formatMoney2(amt, sym)}</td>
      `;
      prevTableBody.appendChild(tr);
    });

    if (prevTableBody.children.length === 0) {
      const tr = document.createElement('tr');
      tr.className = 'empty-row';
      tr.innerHTML = `<td colspan="4">Fill in item details above</td>`;
      prevTableBody.appendChild(tr);
    }
  }

  // Totals
  const subtotal  = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const disc      = parseFloat(discountRate.value) || 0;
  const tax       = parseFloat(taxRate.value)      || 0;
  const discAmt   = subtotal * (disc / 100);
  const taxable   = subtotal - discAmt;
  const taxAmt    = taxable  * (tax  / 100);
  const total     = taxable  + taxAmt;

  prevSubtotal.textContent = formatMoney2(subtotal, sym);

  if (disc > 0) {
    discountRow.style.display = '';
    prevDiscount.textContent  = `− ${formatMoney2(discAmt, sym)} (${disc}%)`;
  } else {
    discountRow.style.display = 'none';
  }

  if (tax > 0) {
    taxRow.style.display = '';
    prevTax.textContent  = `${formatMoney2(taxAmt, sym)} (${tax}%)`;
  } else {
    taxRow.style.display = 'none';
  }

  prevTotal.textContent = formatMoney2(total, sym);
}

// ─── PRINT ────────────────────────────────
function printInvoice() {
  window.print();
}

// ─── CLEAR ────────────────────────────────
function clearAll() {
  if (!confirm('Clear all invoice data?')) return;

  fromName.value = fromAddress.value = toName.value = toAddress.value = '';
  invoiceNum.value = 'INV-0001';
  notes.value = '';
  taxRate.value = discountRate.value = 0;

  const today = new Date();
  const due   = new Date(today);
  due.setDate(due.getDate() + 30);
  invoiceDate.value = toDateInputValue(today);
  dueDate.value     = toDateInputValue(due);

  items = [];
  lineItemsCnt.innerHTML = '';
  addItem();
  addItem();
  updatePreview();
}

// ─── HELPERS ──────────────────────────────
function formatMoney(n) {
  const sym = currency ? currency.value : '$';
  return sym + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatMoney2(n, sym) {
  return sym + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ─── KEYBOARD SHORTCUT ────────────────────
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    printInvoice();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    addItem();
  }
});

// ─── START ────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
