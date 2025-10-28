/**
 * BusinessVision Order Form
 * Client-side interactivity and calculations
 */

// Configuration
const CONFIG = {
  taxRates: {
    gst: 0.05,  // 5% GST/HST
    pst: 0.08   // 8% P.S.T.
  },
  apiEndpoint: '/api/submit-order.php',
  maxPayloadSize: 1048576 // 1MB
};

// State
let lineItemCounter = 0;
const state = {
  lineItems: []
};

// DOM Elements
const elements = {
  form: null,
  lineItemsBody: null,
  addLineBtn: null,
  resetBtn: null,
  submitBtn: null,
  alertContainer: null,
  // Summary elements
  entriesCount: null,
  subtotal: null,
  discountDisplay: null,
  freightDisplay: null,
  gstAmount: null,
  pstAmount: null,
  orderTotal: null,
  grossProfit: null,
  // Input elements
  discount: null,
  freight: null
};

/**
 * Initialize the application
 */
function init() {
  // Cache DOM elements
  cacheElements();
  
  // Set default date to today
  document.getElementById('orderDate').valueAsDate = new Date();
  
  // Add initial line item
  addLineItem();
  
  // Attach event listeners
  attachEventListeners();
  
  console.log('Order form initialized');
}

/**
 * Cache DOM elements for better performance
 */
function cacheElements() {
  elements.form = document.getElementById('orderForm');
  elements.lineItemsBody = document.getElementById('lineItemsBody');
  elements.addLineBtn = document.getElementById('addLineBtn');
  elements.resetBtn = document.getElementById('resetBtn');
  elements.submitBtn = document.getElementById('submitBtn');
  elements.alertContainer = document.getElementById('alertContainer');
  
  // Summary elements
  elements.entriesCount = document.getElementById('entriesCount');
  elements.subtotal = document.getElementById('subtotal');
  elements.discountDisplay = document.getElementById('discountDisplay');
  elements.freightDisplay = document.getElementById('freightDisplay');
  elements.gstAmount = document.getElementById('gstAmount');
  elements.pstAmount = document.getElementById('pstAmount');
  elements.orderTotal = document.getElementById('orderTotal');
  elements.grossProfit = document.getElementById('grossProfit');
  
  // Input elements
  elements.discount = document.getElementById('discount');
  elements.freight = document.getElementById('freight');
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
  elements.addLineBtn.addEventListener('click', addLineItem);
  elements.resetBtn.addEventListener('click', handleReset);
  elements.form.addEventListener('submit', handleSubmit);
  elements.discount.addEventListener('input', updateSummary);
  elements.freight.addEventListener('input', updateSummary);
}

/**
 * Add a new line item row
 */
function addLineItem() {
  const rowId = ++lineItemCounter;
  const row = document.createElement('tr');
  row.id = `line-${rowId}`;
  row.dataset.lineId = rowId;
  
  row.innerHTML = `
    <td>
      <input type="text" class="form-control form-control-sm line-warehouse" 
             name="lines[${rowId}][warehouse]" aria-label="Warehouse">
    </td>
    <td>
      <input type="text" class="form-control form-control-sm line-part" 
             name="lines[${rowId}][partNumber]" aria-label="Part Number">
    </td>
    <td>
      <input type="text" class="form-control form-control-sm line-description" 
             name="lines[${rowId}][description]" aria-label="Description">
    </td>
    <td>
      <input type="text" class="form-control form-control-sm line-uom" 
             name="lines[${rowId}][uom]" aria-label="UOM">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm line-qty" 
             name="lines[${rowId}][qty]" value="0" min="0" step="1" 
             data-line-id="${rowId}" aria-label="Quantity">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm line-unit-price" 
             name="lines[${rowId}][unitPrice]" value="0" min="0" step="0.01" 
             data-line-id="${rowId}" aria-label="Unit Price">
    </td>
    <td>
      <input type="number" class="form-control form-control-sm line-cost-price" 
             name="lines[${rowId}][costPrice]" value="0" min="0" step="0.01" 
             data-line-id="${rowId}" aria-label="Cost Price">
    </td>
    <td class="text-center">
      <input type="checkbox" class="form-check-input" 
             name="lines[${rowId}][tax1]" data-line-id="${rowId}" 
             aria-label="Sales Tax 1">
    </td>
    <td class="text-center">
      <input type="checkbox" class="form-check-input" 
             name="lines[${rowId}][tax2]" data-line-id="${rowId}" 
             aria-label="Sales Tax 2">
    </td>
    <td>
      <input type="text" class="form-control form-control-sm line-extd-price" 
             id="extd-${rowId}" readonly tabindex="-1" value="$0.00" 
             aria-label="Extended Price">
    </td>
    <td>
      <input type="text" class="form-control form-control-sm line-margin" 
             id="margin-${rowId}" readonly tabindex="-1" value="0.00%" 
             aria-label="Margin Percentage">
    </td>
    <td>
      <button type="button" class="btn btn-sm btn-outline-danger btn-remove-line" 
              data-line-id="${rowId}" aria-label="Remove line">
        <i class="bi bi-trash"></i>
      </button>
    </td>
  `;
  
  elements.lineItemsBody.appendChild(row);
  
  // Attach event listeners to the new row
  attachLineItemListeners(row, rowId);
  
  updateSummary();
}

/**
 * Attach event listeners to a line item row
 */
function attachLineItemListeners(row, rowId) {
  // Quantity, price, and cost inputs trigger calculations
  const qtyInput = row.querySelector('.line-qty');
  const unitPriceInput = row.querySelector('.line-unit-price');
  const costPriceInput = row.querySelector('.line-cost-price');
  const tax1Input = row.querySelector('input[type="checkbox"][name*="tax1"]');
  const tax2Input = row.querySelector('input[type="checkbox"][name*="tax2"]');
  
  qtyInput.addEventListener('input', () => updateLineCalculations(rowId));
  unitPriceInput.addEventListener('input', () => updateLineCalculations(rowId));
  costPriceInput.addEventListener('input', () => updateLineCalculations(rowId));
  tax1Input.addEventListener('change', updateSummary);
  tax2Input.addEventListener('change', updateSummary);
  
  // Remove button
  const removeBtn = row.querySelector('.btn-remove-line');
  removeBtn.addEventListener('click', () => removeLineItem(rowId));
}

/**
 * Update calculations for a specific line item
 */
function updateLineCalculations(lineId) {
  const row = document.getElementById(`line-${lineId}`);
  if (!row) return;
  
  const qty = parseFloat(row.querySelector('.line-qty').value) || 0;
  const unitPrice = parseFloat(row.querySelector('.line-unit-price').value) || 0;
  const costPrice = parseFloat(row.querySelector('.line-cost-price').value) || 0;
  
  // Calculate extended price
  const extdPrice = calculateExtendedPrice(qty, unitPrice);
  row.querySelector(`#extd-${lineId}`).value = formatCurrency(extdPrice);
  
  // Calculate margin percentage
  const marginPercent = calculateMarginPercent(unitPrice, costPrice);
  row.querySelector(`#margin-${lineId}`).value = formatPercent(marginPercent);
  
  // Update summary
  updateSummary();
}

/**
 * Remove a line item
 */
function removeLineItem(lineId) {
  const row = document.getElementById(`line-${lineId}`);
  if (row) {
    row.remove();
    updateSummary();
  }
  
  // Ensure at least one line exists
  if (elements.lineItemsBody.children.length === 0) {
    addLineItem();
  }
}

/**
 * Calculate extended price (qty * unit price)
 */
function calculateExtendedPrice(qty, unitPrice) {
  return qty * unitPrice;
}

/**
 * Calculate margin percentage ((1 - cost/unit) * 100)
 */
function calculateMarginPercent(unitPrice, costPrice) {
  if (unitPrice <= 0) return 0;
  return (1 - (costPrice / unitPrice)) * 100;
}

/**
 * Update all summary calculations
 */
function updateSummary() {
  const lines = getAllLineItems();
  
  // Count entries (lines with qty > 0)
  const entries = lines.filter(line => line.qty > 0).length;
  elements.entriesCount.textContent = entries;
  
  // Calculate subtotal
  const subtotalValue = lines.reduce((sum, line) => sum + line.extdPrice, 0);
  elements.subtotal.textContent = formatCurrency(subtotalValue);
  
  // Get discount and freight
  const discount = parseFloat(elements.discount.value) || 0;
  const freight = parseFloat(elements.freight.value) || 0;
  elements.discountDisplay.textContent = formatCurrency(discount);
  elements.freightDisplay.textContent = formatCurrency(freight);
  
  // Calculate taxes
  const hasTax1 = lines.some(line => line.tax1);
  const hasTax2 = lines.some(line => line.tax2);
  
  const taxableAmount = subtotalValue - discount + freight;
  const gst = hasTax1 ? taxableAmount * CONFIG.taxRates.gst : 0;
  const pst = hasTax2 ? taxableAmount * CONFIG.taxRates.pst : 0;
  
  elements.gstAmount.textContent = formatCurrency(gst);
  elements.pstAmount.textContent = formatCurrency(pst);
  
  // Calculate total
  const total = subtotalValue - discount + freight + gst + pst;
  elements.orderTotal.textContent = formatCurrency(total);
  
  // Calculate gross profit (subtotal - sum of cost*qty)
  const totalCost = lines.reduce((sum, line) => sum + (line.qty * line.costPrice), 0);
  const grossProfit = subtotalValue - totalCost;
  elements.grossProfit.textContent = formatCurrency(grossProfit);
}

/**
 * Get all line items data
 */
function getAllLineItems() {
  const lines = [];
  const rows = elements.lineItemsBody.querySelectorAll('tr');
  
  rows.forEach(row => {
    const lineId = row.dataset.lineId;
    const qty = parseFloat(row.querySelector('.line-qty').value) || 0;
    const unitPrice = parseFloat(row.querySelector('.line-unit-price').value) || 0;
    const costPrice = parseFloat(row.querySelector('.line-cost-price').value) || 0;
    const tax1 = row.querySelector('input[name*="tax1"]').checked;
    const tax2 = row.querySelector('input[name*="tax2"]').checked;
    const extdPrice = qty * unitPrice;
    
    lines.push({
      lineId,
      warehouse: row.querySelector('.line-warehouse').value,
      partNumber: row.querySelector('.line-part').value,
      description: row.querySelector('.line-description').value,
      uom: row.querySelector('.line-uom').value,
      qty,
      unitPrice,
      costPrice,
      tax1,
      tax2,
      extdPrice
    });
  });
  
  return lines;
}

/**
 * Validate the form
 */
function validateForm() {
  const errors = [];
  
  // Check required fields
  const customerNo = document.getElementById('customerNo').value.trim();
  if (!customerNo) {
    errors.push('Customer number is required');
  }
  
  // Check line items
  const lines = getAllLineItems();
  const validLines = lines.filter(line => line.qty > 0 && line.unitPrice >= 0);
  
  if (validLines.length === 0) {
    errors.push('At least one line item with quantity > 0 and valid unit price is required');
  }
  
  // Validate numeric fields
  validLines.forEach((line, index) => {
    if (line.unitPrice < 0) {
      errors.push(`Line ${index + 1}: Unit price must be >= 0`);
    }
    if (line.costPrice < 0) {
      errors.push(`Line ${index + 1}: Cost price must be >= 0`);
    }
  });
  
  return errors;
}

/**
 * Handle form submission
 */
async function handleSubmit(event) {
  event.preventDefault();
  
  // Add validation classes
  elements.form.classList.add('was-validated');
  
  // Validate form
  const errors = validateForm();
  if (errors.length > 0) {
    showAlert('danger', 'Validation Error', errors.join('<br>'));
    return;
  }
  
  // Collect form data
  const formData = collectFormData();
  
  // Check payload size
  const payloadSize = JSON.stringify(formData).length;
  if (payloadSize > CONFIG.maxPayloadSize) {
    showAlert('danger', 'Error', 'Order data is too large (exceeds 1MB limit)');
    return;
  }
  
  // Disable submit button
  elements.submitBtn.disabled = true;
  elements.submitBtn.classList.add('loading');
  
  try {
    const response = await fetch(CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      showAlert('success', 'Success', `Order ${result.orderNumber} saved successfully!`);
      
      // Update order number field if it was auto-generated
      if (result.orderNumber && !formData.orderNumber) {
        document.getElementById('orderNumber').value = result.orderNumber;
      }
      
      // Remove validation classes
      elements.form.classList.remove('was-validated');
    } else {
      showAlert('danger', 'Error', result.message || 'Failed to save order');
    }
  } catch (error) {
    console.error('Submit error:', error);
    showAlert('danger', 'Error', 'Failed to submit order. Please check your connection and try again.');
  } finally {
    elements.submitBtn.disabled = false;
    elements.submitBtn.classList.remove('loading');
  }
}

/**
 * Collect all form data
 */
function collectFormData() {
  return {
    orderNumber: document.getElementById('orderNumber').value.trim(),
    customerNo: document.getElementById('customerNo').value.trim(),
    shipToId: document.getElementById('shipToId').value.trim(),
    poNumber: document.getElementById('poNumber').value.trim(),
    status: document.getElementById('status').value,
    orderDate: document.getElementById('orderDate').value,
    requiredDate: document.getElementById('requiredDate').value,
    invoiceDate: document.getElementById('invoiceDate').value,
    lineItems: getAllLineItems().filter(line => line.qty > 0), // Only include lines with qty > 0
    discount: parseFloat(elements.discount.value) || 0,
    freight: parseFloat(elements.freight.value) || 0,
    summary: {
      entries: getAllLineItems().filter(line => line.qty > 0).length,
      subtotal: parseFloat(elements.subtotal.textContent.replace(/[$,]/g, '')) || 0,
      discount: parseFloat(elements.discount.value) || 0,
      freight: parseFloat(elements.freight.value) || 0,
      gst: parseFloat(elements.gstAmount.textContent.replace(/[$,]/g, '')) || 0,
      pst: parseFloat(elements.pstAmount.textContent.replace(/[$,]/g, '')) || 0,
      total: parseFloat(elements.orderTotal.textContent.replace(/[$,]/g, '')) || 0,
      grossProfit: parseFloat(elements.grossProfit.textContent.replace(/[$,]/g, '')) || 0
    }
  };
}

/**
 * Handle form reset
 */
function handleReset() {
  if (confirm('Are you sure you want to reset the form? All data will be lost.')) {
    elements.form.reset();
    elements.form.classList.remove('was-validated');
    
    // Clear line items
    elements.lineItemsBody.innerHTML = '';
    lineItemCounter = 0;
    
    // Reset date
    document.getElementById('orderDate').valueAsDate = new Date();
    
    // Add initial line item
    addLineItem();
    
    // Update summary
    updateSummary();
    
    showAlert('info', 'Reset', 'Form has been reset');
  }
}

/**
 * Show alert message
 */
function showAlert(type, title, message) {
  const alertId = `alert-${Date.now()}`;
  const alert = document.createElement('div');
  alert.id = alertId;
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.setAttribute('role', 'alert');
  alert.innerHTML = `
    <strong>${title}:</strong> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  elements.alertContainer.appendChild(alert);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const alertElement = document.getElementById(alertId);
    if (alertElement) {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alertElement);
      bsAlert.close();
    }
  }, 5000);
}

/**
 * Format number as currency
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format number as percentage
 */
function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export functions for testing
export {
  calculateExtendedPrice,
  calculateMarginPercent,
  formatCurrency,
  formatPercent,
  CONFIG
};
