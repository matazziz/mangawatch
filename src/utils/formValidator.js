export class FormValidator {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePassword(password) {
        // Au moins 8 caractères, une majuscule, une minuscule, un chiffre
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
        return passwordRegex.test(password);
    }

    static validateForm(form) {
        const errors = {};
        const formData = new FormData(form);

        // Validation des champs
        formData.forEach((value, key) => {
            if (!value.trim()) {
                errors[key] = 'Ce champ est requis';
            }

            if (key === 'email' && !this.validateEmail(value)) {
                errors[key] = 'Format email invalide';
            }

            if (key === 'password' && !this.validatePassword(value)) {
                errors[key] = 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre';
            }
        });

        return errors;
    }

    static addValidationMessages(form, errors) {
        const formGroups = form.querySelectorAll('.form-group');
        formGroups.forEach(group => {
            const input = group.querySelector('input, select, textarea');
            const errorDiv = group.querySelector('.error-message');

            if (errors[input.name]) {
                if (!errorDiv) {
                    const error = document.createElement('div');
                    error.className = 'error-message';
                    error.textContent = errors[input.name];
                    group.appendChild(error);
                }
            } else if (errorDiv) {
                errorDiv.remove();
            }
        });
    }

    static addEventListeners(form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const errors = this.validateForm(form);
            this.addValidationMessages(form, errors);

            if (Object.keys(errors).length === 0) {
                form.submit();
            }
        });

        form.addEventListener('input', (e) => {
            const input = e.target;
            const formGroup = input.closest('.form-group');
            const errorDiv = formGroup.querySelector('.error-message');

            if (errorDiv) {
                errorDiv.remove();
            }
        });
    }
}
