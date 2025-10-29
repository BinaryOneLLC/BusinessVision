// Business Vision - Order Form Module

// Configuration
const config = {
    apiUrl: `${window.BV_BASE || ''}/api/submit-order.php`,
    taxRate: 0.10 // 10% tax rate
};

// State
let lineItems = [];
let itemCounter = 0;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeForm();
    setDefaultDate();
    addInitialLineItem();
});

/**
 * Initialize form event listeners
 */
function initializeForm() {
    const form = document.getElementById('orderForm');
    const addButton = document.getElementById('addLineItem');
    const resetButton = document.getElementById('resetButton');

    form.addEventListener('submit', handleSubmit);
    addButton.addEventListener('click', addLineItem);
    resetButton.addEventListener('click', handleReset);
}

/**
 * Set default date to today
 */
function setDefaultDate() {
    const dateInput = document.getElementById('orderDate');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

/**
 * Add initial line item on page load
 */
function addInitialLineItem() {
    addLineItem();
}

/**
 * Add a new line item
 */
function addLineItem() {
    itemCounter++;
    const itemId = `item-${itemCounter}`;
    
    const lineItem = {
        id: itemId,
        description: '',
        quantity: 1,
        unitPrice: 0
    };
    
    lineItems.push(lineItem);
    renderLineItem(lineItem, itemCounter);
    updateSummary();
}

/**
 * Render a line item in the DOM
 */
function renderLineItem(item, itemNumber) {
    const container = document.getElementById('lineItemsContainer');
    
    const itemHtml = `
        <div class="line-item" data-item-id="${item.id}">
            <div class="line-item-header">
                <span class="line-item-number">Item #${itemNumber}</span>
                <button type="button" class="btn btn-danger btn-sm remove-item-btn" data-item-id="${item.id}">
                    <i class="bi bi-trash"></i> Remove
                </button>
            </div>
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="desc-${item.id}" class="form-label">Description *</label>
                    <input type="text" class="form-control item-description" id="desc-${item.id}" 
                           data-item-id="${item.id}" required>
                </div>
                <div class="col-md-3 mb-3">
                    <label for="qty-${item.id}" class="form-label">Quantity *</label>
                    <input type="number" class="form-control item-quantity" id="qty-${item.id}" 
                           data-item-id="${item.id}" min="1" value="1" required>
                </div>
                <div class="col-md-3 mb-3">
                    <label for="price-${item.id}" class="form-label">Unit Price *</label>
                    <input type="number" class="form-control item-price" id="price-${item.id}" 
                           data-item-id="${item.id}" min="0" step="0.01" value="0.00" required>
                </div>
            </div>
            <div class="text-end">
                <strong>Line Total: </strong>
                <span class="line-total" data-item-id="${item.id}">$0.00</span>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHtml);
    
    // Attach event listeners
    const itemElement = container.querySelector(`[data-item-id="${item.id}"]`);
    itemElement.querySelector('.remove-item-btn').addEventListener('click', () => removeLineItem(item.id));
    itemElement.querySelector('.item-description').addEventListener('input', updateLineItem);
    itemElement.querySelector('.item-quantity').addEventListener('input', updateLineItem);
    itemElement.querySelector('.item-price').addEventListener('input', updateLineItem);
}

/**
 * Update line item data
 */
function updateLineItem(event) {
    const itemId = event.target.dataset.itemId;
    const item = lineItems.find(i => i.id === itemId);
    
    if (!item) return;
    
    const itemElement = document.querySelector(`.line-item[data-item-id="${itemId}"]`);
    item.description = itemElement.querySelector('.item-description').value;
    item.quantity = parseFloat(itemElement.querySelector('.item-quantity').value) || 0;
    item.unitPrice = parseFloat(itemElement.querySelector('.item-price').value) || 0;
    
    // Update line total
    const lineTotal = item.quantity * item.unitPrice;
    itemElement.querySelector('.line-total').textContent = formatCurrency(lineTotal);
    
    updateSummary();
}

/**
 * Remove a line item
 */
function removeLineItem(itemId) {
    // Don't allow removing the last item
    if (lineItems.length <= 1) {
        showMessage('You must have at least one line item.', 'warning');
        return;
    }
    
    lineItems = lineItems.filter(item => item.id !== itemId);
    document.querySelector(`.line-item[data-item-id="${itemId}"]`).remove();
    updateSummary();
}

/**
 * Update summary totals
 */
function updateSummary() {
    const subtotal = lineItems.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice);
    }, 0);
    
    const tax = subtotal * config.taxRate;
    const total = subtotal + tax;
    
    document.getElementById('subtotalAmount').textContent = formatCurrency(subtotal);
    document.getElementById('taxAmount').textContent = formatCurrency(tax);
    document.getElementById('totalAmount').textContent = formatCurrency(total);
}

/**
 * Format number as currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

/**
 * Handle form submission
 */
async function handleSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = document.getElementById('saveButton');
    
    // Validate line items
    if (lineItems.length === 0 || !validateLineItems()) {
        showMessage('Please complete all line items before submitting.', 'danger');
        return;
    }
    
    // Get form data
    const subtotal = calculateSubtotal();
    const tax = Math.round(subtotal * config.taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    
    const orderData = {
        customerName: form.customerName.value,
        customerEmail: form.customerEmail.value,
        customerPhone: form.customerPhone.value,
        orderDate: form.orderDate.value,
        lineItems: lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: Math.round(item.quantity * item.unitPrice * 100) / 100
        })),
        subtotal: subtotal,
        tax: tax,
        total: total
    };
    
    // Disable submit button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
    
    try {
        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showMessage(`Order saved successfully! Order ID: ${result.orderId}`, 'success');
            // Reset form after successful submission
            setTimeout(() => {
                form.reset();
                handleReset();
            }, 2000);
        } else {
            throw new Error(result.message || 'Failed to save order');
        }
    } catch (error) {
        console.error('Error submitting order:', error);
        showMessage(`Error: ${error.message}`, 'danger');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="bi bi-save"></i> Save Order';
    }
}

/**
 * Validate all line items have required data
 */
function validateLineItems() {
    return lineItems.every(item => 
        item.description.trim() !== '' && 
        item.quantity > 0 && 
        item.unitPrice >= 0
    );
}

/**
 * Calculate subtotal
 */
function calculateSubtotal() {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
}

/**
 * Handle form reset
 */
function handleReset() {
    // Clear line items
    lineItems = [];
    itemCounter = 0;
    document.getElementById('lineItemsContainer').innerHTML = '';
    
    // Add initial line item
    addInitialLineItem();
    
    // Reset date to today
    setDefaultDate();
    
    // Update summary
    updateSummary();
    
    showMessage('Form has been reset.', 'info');
}

/**
 * Show message to user
 */
function showMessage(message, type = 'info') {
    const container = document.getElementById('messageContainer');
    const alertId = `alert-${Date.now()}`;
    
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', alertHtml);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Export functions for testing (if needed)
export { addLineItem, removeLineItem, updateSummary, formatCurrency };
