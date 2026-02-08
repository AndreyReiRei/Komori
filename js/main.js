// Основные скрипты сайта "Комори"
document.addEventListener( 'DOMContentLoaded', function () {
	// Плавный скролл для якорных ссылок
	document.querySelectorAll( 'a[href^="#"]' ).forEach( anchor => {
		anchor.addEventListener( 'click', function ( e ) {
			const targetId = this.getAttribute( 'href' );

			// Пропускаем пустые ссылки и ссылки на другие страницы
			if ( targetId === '#' || targetId === '#!' ) return;

			const targetElement = document.querySelector( targetId );
			if ( targetElement ) {
				e.preventDefault();

				// Плавная прокрутка
				window.scrollTo( {
					top: targetElement.offsetTop - 100,
					behavior: 'smooth'
				} );
			}
		} );
	} );

	// Базовая обработка модальных окон (если они есть на странице)
	function initModalHandlers() {
		// Закрытие модального окна при клике на крестик
		document.querySelectorAll( '.close-modal' ).forEach( closeBtn => {
			closeBtn.addEventListener( 'click', function () {
				const modal = this.closest( '.modal' );
				if ( modal ) {
					modal.style.display = 'none';
				}
			} );
		} );

		// Закрытие модального окна при клике вне его области
		document.querySelectorAll( '.modal' ).forEach( modal => {
			modal.addEventListener( 'click', function ( e ) {
				if ( e.target === this ) {
					this.style.display = 'none';
				}
			} );
		} );

		// Открытие модального окна при клике на элементы с data-modal-target
		document.querySelectorAll( '[data-modal-target]' ).forEach( trigger => {
			trigger.addEventListener( 'click', function ( e ) {
				e.preventDefault();
				const modalId = this.getAttribute( 'data-modal-target' );
				const modal = document.querySelector( modalId );
				if ( modal ) {
					modal.style.display = 'block';
				}
			} );
		} );
	}

	// Инициализация обработчиков модальных окон
	initModalHandlers();

	// Добавляем текущий год в футер
	const copyright = document.querySelector( '.copyright' );
	if ( copyright && copyright.textContent.includes( '2024' ) ) {
		const currentYear = new Date().getFullYear();
		copyright.innerHTML = copyright.innerHTML.replace( '2024', currentYear );
	}

	// Закрытие бургер-меню при переходе по якорным ссылкам (если есть меню)
	document.querySelectorAll( 'a[href^="#"]' ).forEach( anchor => {
		anchor.addEventListener( 'click', function ( e ) {
			const targetId = this.getAttribute( 'href' );

			if ( targetId === '#' || targetId === '#!' ) return;

			const targetElement = document.querySelector( targetId );
			if ( targetElement && window.innerWidth <= 768 ) {
				// Закрываем меню на мобильных
				const mainNav = document.getElementById( 'mainNav' );
				const burgerMenu = document.getElementById( 'burgerMenu' );
				const navOverlay = document.getElementById( 'navOverlay' );

				if ( mainNav && mainNav.classList.contains( 'active' ) ) {
					mainNav.classList.remove( 'active' );
					if ( burgerMenu ) burgerMenu.classList.remove( 'active' );
					if ( navOverlay ) navOverlay.classList.remove( 'active' );
					document.body.style.overflow = '';
				}
			}
		} );
	} );

	// Общая функция для форм (если есть)
	function initFormHandlers() {
		document.querySelectorAll( 'form' ).forEach( form => {
			form.addEventListener( 'submit', function ( e ) {
				// Проверка обязательных полей
				const requiredFields = this.querySelectorAll( '[required]' );
				let isValid = true;

				requiredFields.forEach( field => {
					if ( !field.value.trim() ) {
						isValid = false;
						field.style.borderColor = '#ff4757';

						// Убираем красную обводку при вводе
						field.addEventListener( 'input', function () {
							this.style.borderColor = '#ffe6ea';
						}, { once: true } );
					}
				} );

				if ( !isValid ) {
					e.preventDefault();
					alert( 'Пожалуйста, заполните все обязательные поля.' );
				}
			} );
		} );
	}

	initFormHandlers();

	// Анимация для элементов при скролле (общая функция)
	function initScrollAnimations() {
		const animatedElements = document.querySelectorAll( '.animate-on-scroll' );

		if ( animatedElements.length > 0 ) {
			const observerOptions = {
				threshold: 0.1,
				rootMargin: '0px 0px -50px 0px'
			};

			const observer = new IntersectionObserver( ( entries ) => {
				entries.forEach( entry => {
					if ( entry.isIntersecting ) {
						entry.target.classList.add( 'animated' );
						observer.unobserve( entry.target );
					}
				} );
			}, observerOptions );

			animatedElements.forEach( element => {
				observer.observe( element );
			} );
		}
	}

	initScrollAnimations();

	// Улучшение доступности для кнопок
	document.querySelectorAll( 'button, [role="button"]' ).forEach( button => {
		// Добавляем обработку нажатия Enter для элементов с role="button"
		if ( button.getAttribute( 'role' ) === 'button' ) {
			button.addEventListener( 'keydown', function ( e ) {
				if ( e.key === 'Enter' || e.key === ' ' ) {
					e.preventDefault();
					this.click();
				}
			} );
		}

		// Добавляем фокус-стили
		button.addEventListener( 'focus', function () {
			this.style.outline = '2px solid #ff6b6b';
			this.style.outlineOffset = '2px';
		} );

		button.addEventListener( 'blur', function () {
			this.style.outline = 'none';
		} );
	} );

	console.log( 'Сайт "Комори" загружен' );
} );