// order-form.js - BusinessVision Order Entry Client-side Logic

// Configuration
const CONFIG = {
  taxRates: {
    gst: 0.05,  // 5% GST/HST
    pst: 0.08   // 8% P.S.T.
  },
  apiEndpoint: '/api/submit-order.php'
};

// State
let lineItemCounter = 0;
let lineItems = [];

// Pure calculation functions for testability

/**
 * Calculate extended price (quantity * unit price)
 */
export function calculateExtendedPrice(quantity, unitPrice) {
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  return qty * price;
}

/**
 * Calculate margin percentage: (1 - cost/unit) * 100
 */
export function calculateMargin(costPrice, unitPrice) {
  const cost = parseFloat(costPrice) || 0;
  const price = parseFloat(unitPrice) || 0;
  
  if (price <= 0) return 0;
  return ((1 - (cost / price)) * 100);
}

/**
 * Calculate subtotal from all line items
 */
export function calculateSubtotal(items) {
  return items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);
}

/**
 * Calculate GST/HST based on items with tax1 checked
 */
export function calculateGST(items, rate) {
  const taxableAmount = items.reduce((sum, item) => {
    if (item.salesTax1) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + (qty * price);
    }
    return sum;
  }, 0);
  return taxableAmount * rate;
}

/**
 * Calculate P.S.T. based on items with tax2 checked
 */
export function calculatePST(items, rate) {
  const taxableAmount = items.reduce((sum, item) => {
    if (item.salesTax2) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + (qty * price);
    }
    return sum;
  }, 0);
  return taxableAmount * rate;
}

/**
 * Calculate gross profit (subtotal - total cost)
 */
export function calculateGrossProfit(items) {
  const subtotal = calculateSubtotal(items);
  const totalCost = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const cost = parseFloat(item.costPrice) || 0;
    return sum + (qty * cost);
  }, 0);
  return subtotal - totalCost;
}

/**
 * Calculate order total
 */
export function calculateTotal(subtotal, discount, freight, gst, pst) {
  const sub = parseFloat(subtotal) || 0;
  const disc = parseFloat(discount) || 0;
  const frt = parseFloat(freight) || 0;
  const gstAmt = parseFloat(gst) || 0;
  const pstAmt = parseFloat(pst) || 0;
  
  return sub - disc + frt + gstAmt + pstAmt;
}

/**
 * Count entries (lines with qty > 0)
 */
export function countEntries(items) {
  return items.filter(item => {
    const qty = parseFloat(item.quantity) || 0;
    return qty > 0;
  }).length;
}

/**
 * Format currency
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value || 0);
}

/**
 * Format percentage
 */
function formatPercentage(value) {
  return `${(value || 0).toFixed(2)}%`;
}

// DOM Helper Functions

/**
 * Create a new line item row
 */
function createLineItemRow() {
  lineItemCounter++;
  const rowId = `line-${lineItemCounter}`;
  
  const tr = document.createElement('tr');
  tr.id = rowId;
  tr.dataset.lineId = lineItemCounter;
  
  tr.innerHTML = `
    <td>
      <input type="text" class="form-control form-control-sm" 
             name="warehouse[]" data-field="warehouse" maxlength="10">
    </td>
    <td>
      <input type="text" class="form-control form-control-sm" 
             name="partNumber[]" data-field="partNumber" maxlength="50">
    </td>
    <td>
      <input type="text" class="form-control form-control-sm" 
             name="description[]" data-field="description" maxlength="200">
    </td>
    <td>
      <input type="text" class="form-control form-control-sm" 
             name="sellUOM[]" data-field="sellUOM" maxlength="10">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm" 
             name="quantity[]" data-field="quantity" min="0" step="1" value="0">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm" 
             name="unitPrice[]" data-field="unitPrice" min="0" step="0.01" value="0">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm" 
             name="costPrice[]" data-field="costPrice" min="0" step="0.01" value="0">
    </td>
    <td class="text-center">
      <input type="checkbox" class="form-check-input" 
             name="salesTax1[]" data-field="salesTax1">
    </td>
    <td class="text-center">
      <input type="checkbox" class="form-check-input" 
             name="salesTax2[]" data-field="salesTax2">
    </td>
    <td>
      <input type="text" class="form-control form-control-sm read-only" 
             data-field="extendedPrice" readonly value="$0.00">
    </td>
    <td>
      <input type="text" class="form-control form-control-sm read-only" 
             data-field="margin" readonly value="0.00%">
    </td>
    <td>
      <button type="button" class="btn btn-sm btn-outline-danger btn-remove-line" 
              aria-label="Remove line">
        <i class="bi bi-trash"></i>
      </button>
    </td>
  `;
  
  return tr;
}

/**
 * Get line item data from a row
 */
function getLineItemData(row) {
  const getValue = (field) => {
    const input = row.querySelector(`[data-field="${field}"]`);
    if (!input) return '';
    
    if (input.type === 'checkbox') {
      return input.checked;
    }
    return input.value;
  };
  
  return {
    warehouse: getValue('warehouse'),
    partNumber: getValue('partNumber'),
    description: getValue('description'),
    sellUOM: getValue('sellUOM'),
    quantity: getValue('quantity'),
    unitPrice: getValue('unitPrice'),
    costPrice: getValue('costPrice'),
    salesTax1: getValue('salesTax1'),
    salesTax2: getValue('salesTax2')
  };
}

/**
 * Update calculated fields for a line item row
 */
function updateLineCalculations(row) {
  const data = getLineItemData(row);
  
  // Calculate extended price
  const extPrice = calculateExtendedPrice(data.quantity, data.unitPrice);
  const extPriceInput = row.querySelector('[data-field="extendedPrice"]');
  if (extPriceInput) {
    extPriceInput.value = formatCurrency(extPrice);
  }
  
  // Calculate margin
  const margin = calculateMargin(data.costPrice, data.unitPrice);
  const marginInput = row.querySelector('[data-field="margin"]');
  if (marginInput) {
    marginInput.value = formatPercentage(margin);
    
    // Color code margin
    if (margin < 0) {
      marginInput.classList.add('text-loss');
      marginInput.classList.remove('text-profit');
    } else if (margin > 0) {
      marginInput.classList.add('text-profit');
      marginInput.classList.remove('text-loss');
    } else {
      marginInput.classList.remove('text-profit', 'text-loss');
    }
  }
}

/**
 * Update all summary calculations
 */
function updateSummary() {
  // Collect all line items
  const rows = document.querySelectorAll('#lineItemsBody tr');
  lineItems = Array.from(rows).map(row => getLineItemData(row));
  
  // Calculate values
  const subtotal = calculateSubtotal(lineItems);
  const discount = parseFloat(document.getElementById('discount').value) || 0;
  const freight = parseFloat(document.getElementById('freight').value) || 0;
  const gst = calculateGST(lineItems, CONFIG.taxRates.gst);
  const pst = calculatePST(lineItems, CONFIG.taxRates.pst);
  const total = calculateTotal(subtotal, discount, freight, gst, pst);
  const grossProfit = calculateGrossProfit(lineItems);
  const entries = countEntries(lineItems);
  
  // Update display
  document.getElementById('entriesCount').textContent = entries;
  document.getElementById('subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('gstAmount').textContent = formatCurrency(gst);
  document.getElementById('pstAmount').textContent = formatCurrency(pst);
  document.getElementById('total').textContent = formatCurrency(total);
  document.getElementById('grossProfit').textContent = formatCurrency(grossProfit);
  
  // Color code gross profit
  const gpElement = document.getElementById('grossProfit');
  if (grossProfit < 0) {
    gpElement.classList.add('text-loss');
    gpElement.classList.remove('text-profit');
  } else if (grossProfit > 0) {
    gpElement.classList.add('text-profit');
    gpElement.classList.remove('text-loss');
  } else {
    gpElement.classList.remove('text-profit', 'text-loss');
  }
}

/**
 * Add a new line item
 */
function addLineItem() {
  const tbody = document.getElementById('lineItemsBody');
  const row = createLineItemRow();
  tbody.appendChild(row);
  
  // Attach event listeners
  attachLineEventListeners(row);
  
  // Focus on first input
  const firstInput = row.querySelector('input[data-field="warehouse"]');
  if (firstInput) {
    firstInput.focus();
  }
  
  updateSummary();
}

/**
 * Remove a line item
 */
function removeLineItem(row) {
  row.remove();
  updateSummary();
}

/**
 * Attach event listeners to a line item row
 */
function attachLineEventListeners(row) {
  // Update calculations on input change
  const inputs = row.querySelectorAll('input:not([readonly])');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      updateLineCalculations(row);
      updateSummary();
    });
  });
  
  // Remove button
  const removeBtn = row.querySelector('.btn-remove-line');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => removeLineItem(row));
  }
}

/**
 * Validate form data
 */
function validateForm() {
  const form = document.getElementById('orderForm');
  
  // Bootstrap validation
  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return false;
  }
  
  // Check for at least one line item with qty > 0
  const hasValidLines = lineItems.some(item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return qty > 0 && price >= 0;
  });
  
  if (!hasValidLines) {
    showToast('Please add at least one line item with quantity > 0 and valid unit price.', 'danger');
    return false;
  }
  
  return true;
}

/**
 * Get form data for submission
 */
function getFormData() {
  return {
    header: {
      orderNumber: document.getElementById('orderNumber').value.trim(),
      customerNo: document.getElementById('customerNo').value.trim(),
      shipToId: document.getElementById('shipToId').value.trim(),
      poNumber: document.getElementById('poNumber').value.trim(),
      status: document.getElementById('status').value,
      orderDate: document.getElementById('orderDate').value,
      requiredDate: document.getElementById('requiredDate').value,
      invoiceDate: document.getElementById('invoiceDate').value
    },
    lineItems: lineItems,
    summary: {
      entries: countEntries(lineItems),
      subtotal: calculateSubtotal(lineItems),
      discount: parseFloat(document.getElementById('discount').value) || 0,
      freight: parseFloat(document.getElementById('freight').value) || 0,
      gst: calculateGST(lineItems, CONFIG.taxRates.gst),
      pst: calculatePST(lineItems, CONFIG.taxRates.pst),
      total: calculateTotal(
        calculateSubtotal(lineItems),
        parseFloat(document.getElementById('discount').value) || 0,
        parseFloat(document.getElementById('freight').value) || 0,
        calculateGST(lineItems, CONFIG.taxRates.gst),
        calculatePST(lineItems, CONFIG.taxRates.pst)
      ),
      grossProfit: calculateGrossProfit(lineItems)
    }
  };
}

/**
 * Submit form data
 */
async function submitForm(event) {
  event.preventDefault();
  
  if (!validateForm()) {
    return;
  }
  
  const formData = getFormData();
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const statusMsg = document.getElementById('statusMessage');
  
  try {
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
    statusMsg.textContent = 'Submitting order...';
    
    const response = await fetch(CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save order');
    }
    
    const result = await response.json();
    
    if (result.success) {
      showToast(`Order ${result.orderNumber} saved successfully!`, 'success');
      statusMsg.textContent = `Order ${result.orderNumber} saved at ${new Date().toLocaleTimeString()}`;
      
      // Update order number field if it was auto-generated
      if (!formData.header.orderNumber) {
        document.getElementById('orderNumber').value = result.orderNumber;
      }
    } else {
      throw new Error(result.error || 'Failed to save order');
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    showToast(`Error: ${error.message}`, 'danger');
    statusMsg.textContent = 'Error saving order';
  } finally {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-save"></i> Save Order';
  }
}

/**
 * Reset form
 */
function resetForm() {
  if (confirm('Are you sure you want to reset the form? All data will be lost.')) {
    document.getElementById('orderForm').reset();
    document.getElementById('orderForm').classList.remove('was-validated');
    
    // Clear line items
    document.getElementById('lineItemsBody').innerHTML = '';
    lineItems = [];
    lineItemCounter = 0;
    
    // Reset dates to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('orderDate').value = today;
    
    // Update summary
    updateSummary();
    
    document.getElementById('statusMessage').textContent = 'Form reset';
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
  const toast = document.getElementById('successToast');
  const toastBody = document.getElementById('toastMessage');
  
  // Update message and styling
  toastBody.textContent = message;
  toast.className = `toast align-items-center text-white border-0`;
  toast.classList.add(type === 'danger' ? 'bg-danger' : 'bg-success');
  
  // Show toast - check if Bootstrap is available
  if (typeof bootstrap !== 'undefined') {
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
  } else {
    // Fallback: simple alert if Bootstrap is not loaded
    console.warn('Bootstrap not loaded, using fallback notification');
    // Show toast manually
    toast.style.display = 'block';
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.style.display = 'none';
        toast.style.opacity = '1';
      }, 300);
    }, 3000);
  }
}

// Initialize application
function init() {
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('orderDate').value = today;
  
  // Add initial line item
  addLineItem();
  
  // Event listeners
  document.getElementById('addLineBtn').addEventListener('click', addLineItem);
  document.getElementById('resetBtn').addEventListener('click', resetForm);
  document.getElementById('orderForm').addEventListener('submit', submitForm);
  
  // Update summary on discount/freight change
  document.getElementById('discount').addEventListener('input', updateSummary);
  document.getElementById('freight').addEventListener('input', updateSummary);
  
  console.log('BusinessVision Order Entry initialized');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
