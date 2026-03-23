/**
 * Главный файл сайта "Комори"
 * Общие функции для всех страниц
 */

document.addEventListener( 'DOMContentLoaded', function () {
	// Плавный скролл для якорных ссылок
	initSmoothScroll();

	// Обработка модальных окон
	API.initModalHandlers();

	// Обновление года в футере
	updateCopyrightYear();

	// Обработка форм
	initFormValidation();

	// Анимации при скролле
	initScrollAnimations();

	// Улучшение доступности
	enhanceAccessibility();

	// Обновление счетчиков в шапке
	API.updateHeaderCounters();

	console.log( 'Сайт "Комори" загружен' );
} );

// Плавный скролл
function initSmoothScroll() {
	document.querySelectorAll( 'a[href^="#"]:not([href="#"])' ).forEach( anchor => {
		anchor.addEventListener( 'click', function ( e ) {
			const targetId = this.getAttribute( 'href' );
			const targetElement = document.querySelector( targetId );

			if ( targetElement ) {
				e.preventDefault();
				window.scrollTo( {
					top: targetElement.offsetTop - 100,
					behavior: 'smooth'
				} );

				// Закрываем мобильное меню если нужно
				closeMobileMenu();
			}
		} );
	} );
}

// Закрытие мобильного меню
function closeMobileMenu() {
	if ( window.innerWidth <= 768 ) {
		const mainNav = document.getElementById( 'mainNav' );
		const burgerMenu = document.getElementById( 'burgerMenu' );
		const navOverlay = document.getElementById( 'navOverlay' );

		if ( mainNav?.classList.contains( 'active' ) ) {
			mainNav.classList.remove( 'active' );
			burgerMenu?.classList.remove( 'active' );
			navOverlay?.classList.remove( 'active' );
			document.body.style.overflow = '';
		}
	}
}

// Обновление года в копирайте
function updateCopyrightYear() {
	const copyright = document.querySelector( '.copyright' );
	if ( copyright && copyright.textContent.includes( '2024' ) ) {
		const currentYear = new Date().getFullYear();
		copyright.innerHTML = copyright.innerHTML.replace( '2024', currentYear );
	}
}

// Валидация форм
function initFormValidation() {
	document.querySelectorAll( 'form' ).forEach( form => {
		form.addEventListener( 'submit', function ( e ) {
			const requiredFields = this.querySelectorAll( '[required]' );
			let isValid = true;

			requiredFields.forEach( field => {
				if ( !field.value.trim() ) {
					isValid = false;
					field.style.borderColor = '#ff4757';

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

// Анимации при скролле
function initScrollAnimations() {
	const animatedElements = document.querySelectorAll( '.animate-on-scroll' );

	if ( animatedElements.length > 0 ) {
		const observer = new IntersectionObserver( ( entries ) => {
			entries.forEach( entry => {
				if ( entry.isIntersecting ) {
					entry.target.classList.add( 'animated' );
					observer.unobserve( entry.target );
				}
			} );
		}, {
			threshold: 0.1,
			rootMargin: '0px 0px -50px 0px'
		} );

		animatedElements.forEach( element => observer.observe( element ) );
	}
}

// Улучшение доступности
function enhanceAccessibility() {
	document.querySelectorAll( 'button, [role="button"]' ).forEach( button => {
		if ( button.getAttribute( 'role' ) === 'button' ) {
			button.addEventListener( 'keydown', function ( e ) {
				if ( e.key === 'Enter' || e.key === ' ' ) {
					e.preventDefault();
					this.click();
				}
			} );
		}

		// Фокус-стили
		button.addEventListener( 'focus', () => {
			button.style.outline = '2px solid #ff6b6b';
			button.style.outlineOffset = '2px';
		} );

		button.addEventListener( 'blur', () => {
			button.style.outline = 'none';
		} );
	} );
}

// Отступ для Main от Header
function initHeaderOffset() {
	const header = document.querySelector( 'header' );
	const main = document.querySelector( 'main' );

	if ( !header || !main ) return;

	function updateOffset() {
		const isMobile = window.innerWidth < 993;

		if ( isMobile ) {
			// На мобильных header фиксированный
			const headerHeight = header.offsetHeight;
			main.style.marginTop = headerHeight + 'px';
		} else {
			// На десктопе header статичный
			main.style.marginTop = '0';
		}
	}

	updateOffset();
	window.addEventListener( 'resize', updateOffset );
}

// Вызываем после загрузки
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initHeaderOffset );
} else {
	initHeaderOffset();
}