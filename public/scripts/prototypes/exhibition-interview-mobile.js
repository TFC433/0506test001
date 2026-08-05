/**
 * Exhibition Interview Mobile Prototype Logic
 * File: public/scripts/prototypes/exhibition-interview-mobile.js
 * Description: Client-only UX prototype logic based on TMTS 2026 Google Form baseline.
 * Pure frontend prototype logic (No API calls).
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'exhibition_interview_prototype_draft';

  // DOM Elements
  const elements = {
    headerTimestamp: document.getElementById('header-timestamp'),
    statusBadge: document.getElementById('status-badge'),
    
    // Inputs
    companyName: document.getElementById('company_name'),
    contactName: document.getElementById('contact_name'),
    roleTitle: document.getElementById('role_title'),
    visitorCount: document.getElementById('visitor_count'),
    companyScale: document.getElementById('company_scale'),

    catOtherCheck: document.getElementById('cat_other_check'),
    catOtherInput: document.getElementById('cat_other'),
    interestOtherCheck: document.getElementById('interest_other_check'),
    interestOtherInput: document.getElementById('interest_other'),
    indMacroOtherCheck: document.getElementById('ind_macro_other_check'),
    indMacroOtherInput: document.getElementById('ind_macro_other'),
    indMicroOtherCheck: document.getElementById('ind_micro_other_check'),
    indMicroOtherInput: document.getElementById('ind_micro_other'),

    notes1: document.getElementById('interview_notes_1'),
    notes2: document.getElementById('interview_notes_2'),
    notes3: document.getElementById('interview_notes_3'),

    // Bottom Action Buttons
    btnDraft: document.getElementById('btn-save-draft'),
    btnComplete: document.getElementById('btn-complete-record'),

    // Toast & Modal Sheet
    toastContainer: document.getElementById('toast'),
    toastMsg: document.getElementById('toast-msg'),
    modalOverlay: document.getElementById('success-modal'),
    btnNewInterview: document.getElementById('btn-new-interview'),
    btnEditCurrent: document.getElementById('btn-edit-current')
  };

  let currentStatus = 'draft';

  // Toast Notification Helper
  function showToast(message, type = 'info') {
    if (!elements.toastMsg) return;
    elements.toastMsg.textContent = message;
    elements.toastMsg.className = `toast ${type} show`;
    setTimeout(() => {
      elements.toastMsg.className = 'toast';
    }, 2800);
  }

  // Update Status Badge UI
  function setStatus(newStatus) {
    currentStatus = newStatus;
    if (elements.statusBadge) {
      if (newStatus === 'completed') {
        elements.statusBadge.className = 'status-badge completed';
        elements.statusBadge.textContent = '已完成';
      } else {
        elements.statusBadge.className = 'status-badge draft';
        elements.statusBadge.textContent = '草稿';
      }
    }
  }

  // Live Timestamp Clock
  function updateTimestamp() {
    const now = new Date();
    const formatted = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (elements.headerTimestamp) {
      elements.headerTimestamp.textContent = formatted;
    }
  }

  // Get Checked Checkbox Values Array
  function getCheckedValues(name, otherCheckId, otherInputId) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    const values = Array.from(checkboxes).map(cb => cb.value);

    const otherCheck = document.getElementById(otherCheckId);
    const otherInput = document.getElementById(otherInputId);

    if (otherCheck && otherCheck.checked && otherInput && otherInput.value.trim()) {
      values.push(`其他: ${otherInput.value.trim()}`);
    }

    return values;
  }

  // Set Checked Checkboxes from Array
  function setCheckedValues(name, savedValues, otherCheckId, otherInputId) {
    if (!Array.isArray(savedValues)) return;

    const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
    const otherInput = document.getElementById(otherInputId);
    const otherCheck = document.getElementById(otherCheckId);

    checkboxes.forEach(cb => {
      cb.checked = savedValues.includes(cb.value);
    });

    const otherEntry = savedValues.find(v => typeof v === 'string' && v.startsWith('其他: '));
    if (otherEntry && otherCheck && otherInput) {
      otherCheck.checked = true;
      otherInput.value = otherEntry.replace('其他: ', '');
    }
  }

  // Auto Check "其他" when typing in "其他" text input
  function bindOtherInputAutoCheck(inputId, checkId) {
    const input = document.getElementById(inputId);
    const check = document.getElementById(checkId);
    if (input && check) {
      input.addEventListener('input', () => {
        if (input.value.trim() !== '') {
          check.checked = true;
        }
      });
    }
  }

  // Read Form Data Object
  function collectFormData() {
    return {
      timestamp: elements.headerTimestamp ? elements.headerTimestamp.textContent : '',
      company_name: elements.companyName ? elements.companyName.value.trim() : '',
      contact_name: elements.contactName ? elements.contactName.value.trim() : '',
      role_title: elements.roleTitle ? elements.roleTitle.value.trim() : '',
      visitor_count: elements.visitorCount ? elements.visitorCount.value : '',
      company_scale: elements.companyScale ? elements.companyScale.value : '',
      
      cat: getCheckedValues('cat', 'cat_other_check', 'cat_other'),
      interest: getCheckedValues('interest', 'interest_other_check', 'interest_other'),
      ind_macro: getCheckedValues('ind_macro', 'ind_macro_other_check', 'ind_macro_other'),
      ind_micro: getCheckedValues('ind_micro', 'ind_micro_other_check', 'ind_micro_other'),

      interview_notes_1: elements.notes1 ? elements.notes1.value.trim() : '',
      interview_notes_2: elements.notes2 ? elements.notes2.value.trim() : '',
      interview_notes_3: elements.notes3 ? elements.notes3.value.trim() : '',

      status: currentStatus
    };
  }

  // Populate Form from Saved Data
  function populateForm(data) {
    if (!data) return;

    if (data.company_name && elements.companyName) elements.companyName.value = data.company_name;
    if (data.contact_name && elements.contactName) elements.contactName.value = data.contact_name;
    if (data.role_title && elements.roleTitle) elements.roleTitle.value = data.role_title;
    if (data.visitor_count && elements.visitorCount) elements.visitorCount.value = data.visitor_count;
    if (data.company_scale && elements.companyScale) elements.companyScale.value = data.company_scale;

    setCheckedValues('cat', data.cat, 'cat_other_check', 'cat_other');
    setCheckedValues('interest', data.interest, 'interest_other_check', 'interest_other');
    setCheckedValues('ind_macro', data.ind_macro, 'ind_macro_other_check', 'ind_macro_other');
    setCheckedValues('ind_micro', data.ind_micro, 'ind_micro_other_check', 'ind_micro_other');

    if (data.interview_notes_1 && elements.notes1) elements.notes1.value = data.interview_notes_1;
    if (data.interview_notes_2 && elements.notes2) elements.notes2.value = data.interview_notes_2;
    if (data.interview_notes_3 && elements.notes3) elements.notes3.value = data.interview_notes_3;

    if (data.status) setStatus(data.status);
  }

  // Save Draft to localStorage
  function saveDraft() {
    try {
      const data = collectFormData();
      data.status = 'draft';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStatus('draft');
      showToast('草稿已儲存至本地', 'info');
    } catch (e) {
      showToast('儲存草稿失敗', 'warning');
    }
  }

  // Load Saved Draft on Start
  function loadDraftOnStart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        populateForm(parsed);
        showToast('已還原上次草稿', 'info');
      }
    } catch (e) {}
  }

  // Minimal Completion Validation Rule
  function validateCompletion(data) {
    const hasIdentity = Boolean(data.company_name || data.contact_name);
    const hasContent =
      data.cat.length > 0 ||
      data.interest.length > 0 ||
      data.ind_macro.length > 0 ||
      data.ind_micro.length > 0 ||
      Boolean(data.interview_notes_1) ||
      Boolean(data.interview_notes_2) ||
      Boolean(data.interview_notes_3);

    if (!hasIdentity) {
      return {
        valid: false,
        message: '請至少填寫「客戶公司名稱」或「主要客戶姓名」。'
      };
    }

    if (!hasContent) {
      return {
        valid: false,
        message: '請勾選至少一項客戶類別/興趣/產業，或填寫訪談內容。'
      };
    }

    return { valid: true };
  }

  // Complete Record Action
  function completeRecord() {
    const data = collectFormData();
    const validation = validateCompletion(data);

    if (!validation.valid) {
      showToast(validation.message, 'warning');
      return;
    }

    data.status = 'completed';
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}

    setStatus('completed');
    if (elements.modalOverlay) {
      elements.modalOverlay.classList.add('active');
    }
  }

  // Clear Form for Next Record
  function resetForm() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}

    if (elements.companyName) elements.companyName.value = '';
    if (elements.contactName) elements.contactName.value = '';
    if (elements.roleTitle) elements.roleTitle.value = '';
    if (elements.visitorCount) elements.visitorCount.value = '';
    if (elements.companyScale) elements.companyScale.value = '';

    if (elements.catOtherInput) elements.catOtherInput.value = '';
    if (elements.catOtherCheck) elements.catOtherCheck.checked = false;
    if (elements.interestOtherInput) elements.interestOtherInput.value = '';
    if (elements.interestOtherCheck) elements.interestOtherCheck.checked = false;
    if (elements.indMacroOtherInput) elements.indMacroOtherInput.value = '';
    if (elements.indMacroOtherCheck) elements.indMacroOtherCheck.checked = false;
    if (elements.indMicroOtherInput) elements.indMicroOtherInput.value = '';
    if (elements.indMicroOtherCheck) elements.indMicroOtherCheck.checked = false;

    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

    if (elements.notes1) elements.notes1.value = '';
    if (elements.notes2) elements.notes2.value = '';
    if (elements.notes3) elements.notes3.value = '';

    if (elements.modalOverlay) elements.modalOverlay.classList.remove('active');
    setStatus('draft');
    updateTimestamp();
    showToast('已開啟全新紀錄表', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Init Execution
  function init() {
    updateTimestamp();

    bindOtherInputAutoCheck('cat_other', 'cat_other_check');
    bindOtherInputAutoCheck('interest_other', 'interest_other_check');
    bindOtherInputAutoCheck('ind_macro_other', 'ind_macro_other_check');
    bindOtherInputAutoCheck('ind_micro_other', 'ind_micro_other_check');

    loadDraftOnStart();

    if (elements.btnDraft) elements.btnDraft.addEventListener('click', saveDraft);
    if (elements.btnComplete) elements.btnComplete.addEventListener('click', completeRecord);

    if (elements.btnNewInterview) elements.btnNewInterview.addEventListener('click', resetForm);
    if (elements.btnEditCurrent) elements.btnEditCurrent.addEventListener('click', () => {
      if (elements.modalOverlay) elements.modalOverlay.classList.remove('active');
    });

    console.log('📱 Exhibition Interview UI Framework Prototype initialized (Pure Frontend)');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
