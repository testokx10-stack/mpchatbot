/**
 * Lead Tracking - CSV Logger
 * Tracks all customer interactions and marks confirmed leads
 */

const fs = require('fs');
const path = require('path');

// CSV file path
const CSV_FILE = path.join(__dirname, 'leads.csv');
const HEADER = '"Timestamp","Phone Number","Status","Message Count","Last Message","Products","Notes"\n';

// Initialize CSV file if it doesn't exist
function initializeCSV() {
    if (!fs.existsSync(CSV_FILE)) {
        fs.writeFileSync(CSV_FILE, HEADER, 'utf8');
        console.log('📊 Created leads.csv file at:', CSV_FILE);
    } else {
        console.log('📊 leads.csv already exists at:', CSV_FILE);
    }
}

function logLead(phoneNumber, status, message = '', notes = '', products = '') {
    try {
        const timestamp = new Date().toISOString();
        // Normalize phone number: remove special chars, always add +
        const cleanPhone = '+' + phoneNumber.replace(/[^\d]/g, '');
        
        // Make sure CSV file exists - create if missing
        if (!fs.existsSync(CSV_FILE)) {
            fs.writeFileSync(CSV_FILE, HEADER, 'utf8');
            console.log('📊 leads.csv created (was missing) at:', CSV_FILE);
        }
        
        // Sanitize message and notes for CSV
        const safeMessage = (message || '').replace(/"/g, '""').substring(0, 200).trim();
        const safeNotes = (notes || '').replace(/"/g, '""').trim();
        const safeProducts = (products || '').replace(/"/g, '""').trim();
        
        // Read current CSV
        let fullContent = fs.readFileSync(CSV_FILE, 'utf8');
        let lines = fullContent.split('\n');
        
        // First line is always header
        const headerLine = lines[0];
        
        // Get data lines (skip header and empty lines)
        let dataLines = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                dataLines.push(line);
            }
        }
        
        // Look for existing phone number in data (normalize both sides for comparison)
        let foundIndex = -1;
        for (let i = 0; i < dataLines.length; i++) {
            const lineCleanPhone = dataLines[i].match(/"([^"]+)"/)[1]; // Extract first quoted field
            if (lineCleanPhone === cleanPhone.replace(/\D/g, '') || dataLines[i].includes(cleanPhone)) {
                foundIndex = i;
                break;
            }
        }
        
        // Create new entry in quoted format
        const newLine = `"${timestamp}","${cleanPhone}","${status}","1","${safeMessage}","${safeProducts}","${safeNotes}"`;
        
        if (foundIndex > -1) {
            // UPDATE existing lead - increment message count
            const existingLine = dataLines[foundIndex];
            
            // Extract message count (4th field)
            const quotedFields = existingLine.match(/"[^"]*"/g) || [];
            let messageCount = 1;
            if (quotedFields.length >= 4) {
                messageCount = (parseInt(quotedFields[3].replace(/"/g, '')) || 1) + 1;
            }
            
            // Determine final status: allow downgrade from confirmed to interested if customer hesitates
            let finalStatus = status;
            const existingStatus = quotedFields.length >= 3 ? quotedFields[2].replace(/"/g, '') : 'new';
            
            // Status progression: new → interested → confirmed (can go back if customer hesitates)
            if (existingStatus === 'confirmed' && status === 'interested') {
                // Allow downgrade from confirmed to interested if customer says they don't want to finalize
                finalStatus = 'interested';
                console.log(`⚠️ Customer hesitated - Downgrading status from confirmed to interested`);
            } else if (existingStatus === 'confirmed') {
                finalStatus = 'confirmed'; // Stay confirmed unless explicitly downgraded
            } else if (existingStatus === 'interested' && status !== 'confirmed') {
                finalStatus = 'interested'; // Stay interested unless moving to confirmed
            } else if (status === 'confirmed') {
                finalStatus = 'confirmed'; // Upgrade to confirmed
            } else if (status === 'interested' && existingStatus === 'new') {
                finalStatus = 'interested'; // Upgrade from new to interested
            } else {
                finalStatus = status;
            }
            
            // Update the line with new timestamp and message count
            // Extract products from existing line if not provided
            let finalProducts = safeProducts;
            if (!finalProducts && quotedFields.length >= 6) {
                finalProducts = quotedFields[5].replace(/"/g, '');
            }
            
            const updatedLine = `"${timestamp}","${cleanPhone}","${finalStatus}","${messageCount}","${safeMessage}","${finalProducts}","${safeNotes}"`;
            dataLines[foundIndex] = updatedLine;
            console.log(`✏️  Updated - Phone: ${cleanPhone}, Status: ${finalStatus}, Msgs: ${messageCount}`);
        } else {
            // NEW lead
            dataLines.push(newLine);
            console.log(`✅ NEW lead - Phone: ${cleanPhone}, Status: ${status}`);
        }
        
        // Reconstruct file: header + data lines + final newline
        const newContent = headerLine + '\n' + dataLines.join('\n') + '\n';
        
        // Write with retry logic
        try {
            fs.writeFileSync(CSV_FILE, newContent, 'utf8');
            console.log(`📝 CSV saved successfully (${dataLines.length} data lines)`);
        } catch (writeError) {
            console.error('❌ Failed to write CSV:', writeError.message);
            // Try alternative write
            fs.writeFileSync(CSV_FILE + '.tmp', newContent, 'utf8');
            fs.renameSync(CSV_FILE + '.tmp', CSV_FILE);
            console.log('✅ CSV saved via temp file method');
        }
        
    } catch (error) {
        console.error('❌ Error in logLead():', error.message);
        console.error('Stack:', error.stack);
    }
}

/**
 * Mark a lead as confirmed (when they receive the WhatsApp link)
 * @param {string} phoneNumber - Customer's phone
 * @param {string} products - Product names that were confirmed
 */
function confirmLead(phoneNumber, products = '') {
    logLead(phoneNumber, 'confirmed', '', 'Sent WhatsApp contact link - qualified lead', products);
}

/**
 * Mark a lead as contacted (when they message the main number)
 * @param {string} phoneNumber - Customer's phone
 */
function contactedWhatsApp(phoneNumber) {
    logLead(phoneNumber, 'contacted_whatsapp', '', 'Lead contacted via WhatsApp');
}

/**
 * Get all leads summary (read from CSV)
 * @returns {object} - Summary of leads by status
 */
function getLeadsSummary() {
    const summary = {
        total: 0,
        new: 0,
        interested: 0,
        confirmed: 0
    };
    
    try {
        const content = fs.readFileSync(CSV_FILE, 'utf8');
        const lines = content.split('\n');
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const match = lines[i].match(/"([^"]+)","([^"]+)","([^"]+)"/);
                if (match) {
                    const status = match[3];
                    summary.total++;
                    if (status === 'new') summary.new++;
                    else if (status === 'interested') summary.interested++;
                    else if (status === 'confirmed') summary.confirmed++;
                }
            }
        }
    } catch (error) {
        console.error('Error reading CSV:', error.message);
    }
    
    return summary;
}

/**
 * Load all existing customers from CSV into memory
 * @returns {array} - Array of phone numbers already in the system
 */
function loadExistingCustomers() {
    const existingPhones = [];
    
    try {
        if (!fs.existsSync(CSV_FILE)) {
            return existingPhones;
        }
        
        const content = fs.readFileSync(CSV_FILE, 'utf8');
        const lines = content.split('\n');
        
        // Skip header (line 0)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Extract phone number from CSV (second field)
            const match = line.match(/"([^"]+)","([^"]+)"/);
            if (match) {
                const phoneNumber = match[2]; // Second field is phone number
                if (phoneNumber && !existingPhones.includes(phoneNumber)) {
                    existingPhones.push(phoneNumber);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error loading existing customers:', error.message);
    }
    
    return existingPhones;
}

/**
 * Export leads to console (for debugging)
 */
function printLeads() {
    const summary = getLeadsSummary();
    console.log('\n📊 === LEADS SUMMARY ===');
    console.log(`Total Unique Contacts: ${summary.total}`);
    console.log(`✅ Confirmed Leads: ${summary.confirmed}`);
    console.log(`⏳ Interested: ${summary.interested}`);
    console.log(`🆕 New: ${summary.new}`);
    console.log('========================\n');
}

module.exports = {
    initializeCSV,
    loadExistingCustomers,
    logLead,
    confirmLead,
    getLeadsSummary,
    printLeads
};
