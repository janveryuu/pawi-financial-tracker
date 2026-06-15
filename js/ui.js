export function showConfirm(title, message, confirmText = 'Delete', isDanger = true) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal-overlay');
    if (!modal) {
      resolve(confirm(message));
      return;
    }
    
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').textContent = message;
    modal.classList.add('active');

    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const confirmBtn = document.getElementById('confirm-modal-delete');
    const iconContainer = document.getElementById('confirm-modal-icon-container');
    
    confirmBtn.textContent = confirmText;
    
    if (isDanger) {
      confirmBtn.className = 'btn btn-danger';
      if (iconContainer) iconContainer.style.display = 'block';
    } else {
      confirmBtn.className = 'btn btn-primary';
      if (iconContainer) iconContainer.style.display = 'none';
    }

    const cleanup = () => {
      modal.classList.remove('active');
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm);
    };

    const onCancel = () => { cleanup(); resolve(false); };
    const onConfirm = () => { cleanup(); resolve(true); };

    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm);
  });
}
