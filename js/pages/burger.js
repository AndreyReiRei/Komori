/**
 * ============================================================================
 * BURGER.JS - МОДУЛЬ БУРГЕР-МЕНЮ ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - Управляет мобильным меню (открытие/закрытие)
 * - Обрабатывает подменю каталога на мобильных
 * - Закрытие по клику на оверлей, Escape, ресайз
 * 
 * ОСОБЕННОСТИ:
 * - НЕ вызывает ошибку если элементы не найдены
 * - Сохраняет работоспособность ссылок при закрытии меню
 * - Блокирует скролл body при открытом меню
 * - Автоматически закрывается при переходе на десктоп
 * - Поддерживает доступность (a11y)
 * 
 * ============================================================================
 */

document.addEventListener( 'DOMContentLoaded', function () {
	// =====================================================================
	// 1. ПОЛУЧАЕМ DOM-ЭЛЕМЕНТЫ
	// =====================================================================

	const burgerMenu = document.getElementById( 'burgerMenu' );
	const mainNav = document.getElementById( 'mainNav' );
	const navOverlay = document.getElementById( 'navOverlay' );
	const catalogLink = document.querySelector( '.has-dropdown > .nav-link' );

	// =====================================================================
	// 2. ПРОВЕРКА НАЛИЧИЯ ЭЛЕМЕНТОВ
	// =====================================================================

	if ( !burgerMenu || !mainNav || !navOverlay ) {
		const missing = [];
		if ( !burgerMenu ) missing.push( '#burgerMenu' );
		if ( !mainNav ) missing.push( '#mainNav' );
		if ( !navOverlay ) missing.push( '#navOverlay' );

		console.log( `🍔 Бургер-меню: элементы не найдены (${missing.join( ', ' )}). Модуль неактивен.` );
		return;
	}

	console.log( '🍔 Бургер-меню: все элементы найдены, инициализация...' );

	// =====================================================================
	// 3. СОСТОЯНИЕ
	// =====================================================================

	let resizeTimer = null;

	// =====================================================================
	// 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
	// =====================================================================

	/**
	 * Открывает мобильное меню
	 */
	function openMenu() {
		if ( !mainNav || !burgerMenu || !navOverlay ) return;

		mainNav.classList.add( 'active' );
		burgerMenu.classList.add( 'active' );
		navOverlay.classList.add( 'active' );

		document.body.style.overflow = 'hidden';
		document.documentElement.style.overflow = 'hidden';

		burgerMenu.setAttribute( 'aria-expanded', 'true' );
		burgerMenu.setAttribute( 'aria-label', 'Закрыть меню' );
		mainNav.setAttribute( 'aria-hidden', 'false' );

		console.log( '🍔 Бургер-меню: открыто' );
	}

	/**
	 * Закрывает мобильное меню
	 */
	function closeMenu() {
		if ( !mainNav || !burgerMenu || !navOverlay ) return;

		mainNav.classList.remove( 'active' );
		burgerMenu.classList.remove( 'active' );
		navOverlay.classList.remove( 'active' );

		document.body.style.overflow = '';
		document.documentElement.style.overflow = '';

		// Закрываем подменю каталога
		const openDropdown = document.querySelector( '.dropdown-menu.active' );
		if ( openDropdown ) {
			openDropdown.classList.remove( 'active' );

			const arrow = document.querySelector( '.has-dropdown .dropdown-arrow' );
			if ( arrow ) {
				arrow.style.transform = '';
			}
		}

		burgerMenu.setAttribute( 'aria-expanded', 'false' );
		burgerMenu.setAttribute( 'aria-label', 'Открыть меню' );
		mainNav.setAttribute( 'aria-hidden', 'true' );

		console.log( '🍔 Бургер-меню: закрыто' );
	}

	/**
	 * Переключает состояние меню
	 */
	function toggleMenu() {
		if ( !mainNav ) return;

		if ( mainNav.classList.contains( 'active' ) ) {
			closeMenu();
		} else {
			openMenu();
		}
	}

	/**
	 * Проверяет, является ли устройство мобильным
	 * @returns {boolean}
	 */
	function isMobile() {
		return window.innerWidth <= 768;
	}

	/**
	 * Безопасно закрывает меню с задержкой для перехода по ссылке
	 * Используется в обработчиках клика по ссылкам
	 */
	function closeMenuWithLinkDelay() {
		// Даем браузеру 100мс чтобы начать переход по ссылке
		// перед закрытием меню
		setTimeout( () => {
			if ( mainNav && mainNav.classList.contains( 'active' ) ) {
				closeMenu();
			}
		}, 100 );
	}

	// =====================================================================
	// 5. ОБРАБОТЧИКИ СОБЫТИЙ
	// =====================================================================

	// 5.1. Клик по бургер-иконке
	burgerMenu.addEventListener( 'click', function ( e ) {
		e.preventDefault();
		e.stopPropagation();
		toggleMenu();
	} );

	// 5.2. Клик по оверлею
	navOverlay.addEventListener( 'click', function ( e ) {
		e.preventDefault();
		closeMenu();
	} );

	// 5.3. Пункт "Каталог" — открытие подменю на мобильных
	if ( catalogLink ) {
		catalogLink.addEventListener( 'click', function ( e ) {
			if ( !isMobile() ) return; // На десктопе — обычный переход

			e.preventDefault();
			e.stopPropagation();

			const catalogItem = this.closest( '.has-dropdown' );
			if ( !catalogItem ) return;

			const dropdown = catalogItem.querySelector( '.dropdown-menu' );
			if ( !dropdown ) return;

			const isActive = dropdown.classList.toggle( 'active' );

			// Анимируем стрелку
			const arrow = this.querySelector( '.dropdown-arrow' );
			if ( arrow ) {
				arrow.style.transform = isActive ? 'rotate(180deg)' : '';
				arrow.style.transition = 'transform 0.3s ease';
			}

			console.log( `🍔 Бургер-меню: подменю ${isActive ? 'открыто' : 'закрыто'}` );
		} );
	} else {
		console.log( '🍔 Бургер-меню: пункт "Каталог" с подменю не найден' );
	}

	// 5.4. Обычные пункты меню (без подменю)
	const regularLinks = document.querySelectorAll( '.nav-list > li:not(.has-dropdown) > .nav-link' );
	if ( regularLinks.length > 0 ) {
		regularLinks.forEach( link => {
			link.addEventListener( 'click', function () {
				if ( isMobile() && mainNav.classList.contains( 'active' ) ) {
					// ✅ ИСПРАВЛЕНО: задержка перед закрытием
					closeMenuWithLinkDelay();
				}
			} );
		} );
		console.log( `🍔 Бургер-меню: найдено ${regularLinks.length} обычных ссылок` );
	}

	// 5.5. Ссылки в подменю каталога
	const dropdownLinks = document.querySelectorAll( '.dropdown-menu a' );
	if ( dropdownLinks.length > 0 ) {
		dropdownLinks.forEach( link => {
			link.addEventListener( 'click', function () {
				if ( isMobile() ) {
					// ✅ ИСПРАВЛЕНО: задержка перед закрытием
					closeMenuWithLinkDelay();
				}
			} );
		} );
		console.log( `🍔 Бургер-меню: найдено ${dropdownLinks.length} ссылок в подменю` );
	}

	// 5.6. Закрытие по Escape
	document.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'Escape' && mainNav && mainNav.classList.contains( 'active' ) ) {
			closeMenu();
			console.log( '🍔 Бургер-меню: закрыто клавишей Escape' );
		}
	} );

	// 5.7. Закрытие при переходе на десктоп (с debounce)
	window.addEventListener( 'resize', function () {
		// ✅ ИСПРАВЛЕНО: добавлен debounce
		clearTimeout( resizeTimer );
		resizeTimer = setTimeout( () => {
			if ( !isMobile() && mainNav && mainNav.classList.contains( 'active' ) ) {
				closeMenu();
				console.log( '🍔 Бургер-меню: закрыто при переходе на десктоп' );
			}
		}, 250 );
	} );

	// 5.8. Предотвращаем закрытие при клике внутри меню
	mainNav.addEventListener( 'click', function ( e ) {
		e.stopPropagation();
	} );

	// 5.9. Закрытие подменю при клике вне его
	document.addEventListener( 'click', function ( e ) {
		if ( !isMobile() ) return;
		if ( !mainNav || !mainNav.classList.contains( 'active' ) ) return;

		const catalogItem = document.querySelector( '.has-dropdown' );
		if ( !catalogItem ) return;

		const dropdown = catalogItem.querySelector( '.dropdown-menu' );
		if ( !dropdown || !dropdown.classList.contains( 'active' ) ) return;

		// Если клик не по каталогу и не внутри подменю
		if ( !catalogItem.contains( e.target ) ) {
			dropdown.classList.remove( 'active' );

			const arrow = catalogItem.querySelector( '.dropdown-arrow' );
			if ( arrow ) {
				arrow.style.transform = '';
			}

			console.log( '🍔 Бургер-меню: подменю закрыто по клику вне' );
		}
	} );

	// 5.10. Обработка ухода фокуса из меню
	mainNav.addEventListener( 'focusout', function () {
		// ✅ ИСПРАВЛЕНО: проверяем что фокус ушел НЕ в подменю
		setTimeout( () => {
			if ( !mainNav.classList.contains( 'active' ) ) return;

			const activeElement = document.activeElement;

			// Не закрываем если фокус на бургер-кнопке
			if ( activeElement === burgerMenu ) return;

			// Не закрываем если фокус внутри меню или подменю
			if ( mainNav.contains( activeElement ) ) return;

			// Фокус ушел из меню — закрываем
			closeMenu();
		}, 100 );
	} );

	// =====================================================================
	// 6. ИНИЦИАЛИЗАЦИЯ
	// =====================================================================

	// Устанавливаем начальные aria-атрибуты
	burgerMenu.setAttribute( 'aria-expanded', 'false' );
	burgerMenu.setAttribute( 'aria-label', 'Открыть меню' );
	burgerMenu.setAttribute( 'aria-haspopup', 'true' );
	mainNav.setAttribute( 'aria-hidden', 'true' );
	navOverlay.setAttribute( 'aria-hidden', 'true' );

	const totalLinks = document.querySelectorAll( '.main-nav a' ).length;
	console.log( `✅ Бургер-меню: инициализировано (${totalLinks} ссылок в меню)` );
} );

// =========================================================================
// ОТЛАДКА В РЕЖИМЕ РАЗРАБОТКИ
// =========================================================================

// ✅ ИСПРАВЛЕНО: проверяем ТОЛЬКО если модуль активен
if ( window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ) {
	// Отложенная проверка чтобы дать DOM загрузиться
	setTimeout( () => {
		const burgerMenu = document.getElementById( 'burgerMenu' );
		if ( !burgerMenu ) return; // Модуль неактивен — не проверяем

		console.log( '🔧 Бургер-меню: режим разработки — проверка ссылок...' );

		document.querySelectorAll( '.main-nav a' ).forEach( link => {
			const href = link.getAttribute( 'href' );

			// Проверяем только локальные ссылки
			if ( href &&
				!href.startsWith( '#' ) &&
				!href.startsWith( 'javascript:' ) &&
				!href.startsWith( 'http' ) &&
				!href.startsWith( '//' ) ) {

				fetch( href, { method: 'HEAD' } )
					.then( response => {
						if ( !response.ok ) {
							console.warn( `⚠️ Бургер-меню: ссылка неактивна: ${href} (${response.status})` );
						}
					} )
					.catch( () => {
						// Игнорируем ошибки CORS для локальных файлов
						// console.warn(`🔍 Бургер-меню: не удалось проверить: ${href}`);
					} );
			}
		} );
	}, 1000 );
}