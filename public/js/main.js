// Enhanced smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Enhanced DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
    // Highlight active navigation item
    highlightActiveNav();
    // Add fade-in animation to elements
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach((element, index) => {
        // Stagger the animations for a more polished effect
        element.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Add slide-in animation to elements
    const slideElements = document.querySelectorAll('.slide-in');
    slideElements.forEach((element, index) => {
        element.style.animationDelay = `${index * 0.15}s`;
    });
    
    // Add scroll to top button functionality
    const scrollToTopButton = document.createElement('button');
    scrollToTopButton.innerHTML = '↑';
    scrollToTopButton.className = 'scroll-to-top';
    scrollToTopButton.setAttribute('aria-label', 'Scroll to top');
    document.body.appendChild(scrollToTopButton);
    
    // Show/hide scroll to top button
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollToTopButton.classList.add('show');
        } else {
            scrollToTopButton.classList.remove('show');
        }
    });
    
    // Scroll to top when button is clicked
    scrollToTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Add loading indicators to forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            const submitButton = this.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<div class="loading-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
            }
        });
    });
    
    // Add smooth page transitions
    const links = document.querySelectorAll('a[href]:not([target="_blank"]):not([href^="#"]):not([href^="mailto:"]):not(.no-transition)');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            // Add loading class to body
            document.body.classList.add('page-transition');
        });
    });
    
    // Initialize tooltips
    initTooltips();
    
    // Initialize form validation
    initFormValidation();
});

// Enhanced notification system
function showNotification(message, type = 'info', duration = 3000) {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'notification-close';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.addEventListener('click', function() {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
    notification.appendChild(closeBtn);
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Hide after duration
    if (duration > 0) {
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
    
    return notification;
}

// Enhanced modal system
function showModal(title, content, options = {}) {
    // Remove any existing modals
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal element
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'modal-title');
    modal.setAttribute('aria-describedby', 'modal-content');
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('h2');
    modalTitle.id = 'modal-title';
    modalTitle.textContent = title;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label', 'Close modal');
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);
    
    const modalBody = document.createElement('div');
    modalBody.id = 'modal-content';
    modalBody.innerHTML = content;
    
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    
    if (options.confirm) {
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.textContent = options.confirmText || 'Confirm';
        confirmBtn.addEventListener('click', function() {
            if (options.onConfirm) options.onConfirm();
            closeModal();
        });
        modalFooter.appendChild(confirmBtn);
    }
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = options.cancelText || 'Cancel';
    cancelBtn.addEventListener('click', closeModal);
    modalFooter.appendChild(cancelBtn);
    
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modal.appendChild(modalContent);
    
    // Add to body
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => {
        modal.classList.add('show');
    }, 100);
    
    // Close on escape key
    const closeOnEscape = function(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', closeOnEscape);
        }
    };
    document.addEventListener('keydown', closeOnEscape);
    
    // Close on click outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close button event
    closeBtn.addEventListener('click', closeModal);
    
    return modal;
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
}

// Enhanced form validation
function initFormValidation() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(this)) {
                e.preventDefault();
            }
        });
    });
}

function validateForm(form) {
    const inputs = form.querySelectorAll('input, select, textarea');
    let isValid = true;
    
    inputs.forEach(input => {
        // Reset validation styles
        input.classList.remove('invalid');
        
        // Check required fields
        if (input.hasAttribute('required') && !input.value.trim()) {
            input.classList.add('invalid');
            isValid = false;
            showNotification(`Please fill in the ${input.name || input.id || 'required'} field`, 'error');
            return;
        }
        
        // Check email format
        if (input.type === 'email' && input.value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.value.trim())) {
                input.classList.add('invalid');
                isValid = false;
                showNotification('Please enter a valid email address', 'error');
                return;
            }
        }
        
        // Check password strength
        if (input.type === 'password' && input.value.trim()) {
            if (input.value.length < 6) {
                input.classList.add('invalid');
                isValid = false;
                showNotification('Password must be at least 6 characters long', 'error');
                return;
            }
        }
        
        // Check custom validation patterns
        if (input.hasAttribute('pattern') && input.value.trim()) {
            const pattern = new RegExp(input.getAttribute('pattern'));
            if (!pattern.test(input.value.trim())) {
                input.classList.add('invalid');
                isValid = false;
                const errorMessage = input.getAttribute('data-error-message') || 'Please enter a valid value';
                showNotification(errorMessage, 'error');
                return;
            }
        }
    });
    
    return isValid;
}

// Initialize tooltips
function initTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(tooltip => {
        tooltip.addEventListener('mouseenter', function() {
            const tooltipText = this.getAttribute('data-tooltip');
            const tooltipElement = document.createElement('div');
            tooltipElement.className = 'tooltip';
            tooltipElement.textContent = tooltipText;
            tooltipElement.style.position = 'absolute';
            tooltipElement.style.backgroundColor = '#333';
            tooltipElement.style.color = '#fff';
            tooltipElement.style.padding = '5px 10px';
            tooltipElement.style.borderRadius = '4px';
            tooltipElement.style.fontSize = '14px';
            tooltipElement.style.zIndex = '1000';
            tooltipElement.style.whiteSpace = 'nowrap';
            
            // Position tooltip
            const rect = this.getBoundingClientRect();
            tooltipElement.style.top = (rect.top - 30) + 'px';
            tooltipElement.style.left = (rect.left + rect.width/2 - tooltipElement.offsetWidth/2) + 'px';
            
            document.body.appendChild(tooltipElement);
            
            // Remove tooltip on mouse leave
            this.addEventListener('mouseleave', function() {
                if (tooltipElement.parentNode) {
                    tooltipElement.parentNode.removeChild(tooltipElement);
                }
            }, {once: true});
        });
    });
}

// Add smooth animations to cards
function initCardAnimations() {
    const cards = document.querySelectorAll('.event-card, .event-item');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Call card animations
initCardAnimations();

// Highlight active navigation item
function highlightActiveNav() {
    // Get current page path
    const currentPage = window.location.pathname;
    
    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Remove active class from all links
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to matching link
    navLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname;
        
        // Special handling for home page
        if (currentPage === '/' && linkPath === '/') {
            link.classList.add('active');
        } 
        // For other pages, check if current page starts with the link path
        else if (currentPage !== '/' && linkPath !== '/' && currentPage.startsWith(linkPath)) {
            link.classList.add('active');
        }
        // Special handling for exact matches
        else if (currentPage === linkPath) {
            link.classList.add('active');
        }
    });
}