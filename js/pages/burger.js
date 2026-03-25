/**
 * Бургер-меню для мобильных устройств
 * Особенности:
 * - Плавное открытие/закрытие
 * - Закрытие при клике на оверлей
 * - Закрытие по клавише Escape
 * - Автоматическое закрытие при изменении размера окна
 * - Поддержка подменю каталога
 * - Мгновенный переход по ссылкам без задержек
 */
document.addEventListener( 'DOMContentLoaded', function () {
	// ========== ПОЛУЧАЕМ ЭЛЕМЕНТЫ ==========
	const burgerMenu = document.getElementById( 'burgerMenu' );
	const mainNav = document.getElementById( 'mainNav' );
	const navOverlay = document.getElementById( 'navOverlay' );
	const catalogLink = document.querySelector( '.has-dropdown > .nav-link' );

	// Проверяем наличие всех необходимых элементов
	if ( !burgerMenu || !mainNav || !navOverlay ) {
		console.error( '❌ Бургер-меню: не найдены необходимые элементы' );
		return;
	}

	// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

	/**
	 * Открывает мобильное меню
	 */
	function openMenu() {
		mainNav.classList.add( 'active' );
		burgerMenu.classList.add( 'active' );
		navOverlay.classList.add( 'active' );

		// Блокируем скролл body при открытом меню
		document.body.style.overflow = 'hidden';
		document.documentElement.style.overflow = 'hidden';
	}

	/**
	 * Закрывает мобильное меню
	 */
	function closeMenu() {
		mainNav.classList.remove( 'active' );
		burgerMenu.classList.remove( 'active' );
		navOverlay.classList.remove( 'active' );

		// Разблокируем скролл
		document.body.style.overflow = '';
		document.documentElement.style.overflow = '';

		// Закрываем подменю каталога, если оно было открыто
		const openDropdown = document.querySelector( '.dropdown-menu.active' );
		if ( openDropdown ) {
			openDropdown.classList.remove( 'active' );
		}
	}

	/**
	 * Переключает состояние меню (открыто/закрыто)
	 */
	function toggleMenu() {
		if ( mainNav.classList.contains( 'active' ) ) {
			closeMenu();
		} else {
			openMenu();
		}
	}

	/**
	 * Проверяет, является ли устройство мобильным
	 * @returns {boolean} true - если ширина экрана <= 768px
	 */
	function isMobile() {
		return window.innerWidth <= 768;
	}

	// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

	// 1. Клик по бургер-иконке - открыть/закрыть меню
	burgerMenu.addEventListener( 'click', function ( e ) {
		e.preventDefault();
		e.stopPropagation();
		toggleMenu();
	} );

	// 2. Клик по оверлею - закрыть меню
	navOverlay.addEventListener( 'click', function ( e ) {
		e.preventDefault();
		closeMenu();
	} );

	// 3. Обработчик для пункта "Каталог" (открытие подменю на мобильных)
	if ( catalogLink ) {
		catalogLink.addEventListener( 'click', function ( e ) {
			// Только на мобильных устройствах
			if ( isMobile() ) {
				e.preventDefault();
				e.stopPropagation();

				const catalogItem = this.closest( '.has-dropdown' );
				const dropdown = catalogItem.querySelector( '.dropdown-menu' );

				if ( dropdown ) {
					// Переключаем класс active для подменю
					dropdown.classList.toggle( 'active' );

					// Стрелка вниз/вверх для визуального эффекта
					const arrow = this.querySelector( '.dropdown-arrow' );
					if ( arrow ) {
						arrow.style.transform = dropdown.classList.contains( 'active' )
							? 'rotate(180deg)'
							: '';
					}
				}
			}
		} );
	}

	// 4. Обработчик для обычных пунктов меню (без подменю)
	document.querySelectorAll( '.nav-list > li:not(.has-dropdown) > .nav-link' ).forEach( link => {
		link.addEventListener( 'click', function ( e ) {
			if ( isMobile() ) {
				// Просто закрываем меню, переход по ссылке произойдет автоматически
				closeMenu();
				// НЕ вызываем preventDefault() - ссылка работает нормально
			}
		} );
	} );

	// 5. Обработчик для ссылок в подменю каталога
	document.querySelectorAll( '.dropdown-menu a' ).forEach( link => {
		link.addEventListener( 'click', function ( e ) {
			if ( isMobile() ) {
				// Закрываем меню перед переходом
				closeMenu();
				// НЕ вызываем preventDefault() - переход по ссылке работает
				// Меню закрывается, страница перезагружается - это нормальное поведение
			}
		} );
	} );

	// 6. Закрытие меню по клавише Escape
	document.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'Escape' && mainNav.classList.contains( 'active' ) ) {
			closeMenu();
		}
	} );

	// 7. Закрытие меню при изменении размера окна (переход на десктоп)
	window.addEventListener( 'resize', function () {
		if ( !isMobile() ) {
			closeMenu();
		}
	} );

	// 8. Предотвращаем закрытие меню при клике внутри самого меню
	mainNav.addEventListener( 'click', function ( e ) {
		e.stopPropagation();
	} );

	// 9. Закрытие подменю при клике вне его (на мобильных)
	document.addEventListener( 'click', function ( e ) {
		if ( isMobile() && mainNav.classList.contains( 'active' ) ) {
			const catalogItem = document.querySelector( '.has-dropdown' );
			const dropdown = catalogItem?.querySelector( '.dropdown-menu' );
			const catalogLink = catalogItem?.querySelector( '.nav-link' );

			// Если клик не по каталогу и не по подменю - закрываем подменю
			if ( dropdown?.classList.contains( 'active' ) &&
				!catalogItem?.contains( e.target ) ) {
				dropdown.classList.remove( 'active' );

				// Возвращаем стрелку в исходное положение
				const arrow = catalogLink?.querySelector( '.dropdown-arrow' );
				if ( arrow ) {
					arrow.style.transform = '';
				}
			}
		}
	} );

	// ========== ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА ==========
	console.log( '✅ Бургер-меню успешно инициализировано' );

	// ========== ДЛЯ ОТЛАДКИ (можно удалить в продакшене) ==========
	// Выводим информацию о количестве ссылок в меню
	const totalLinks = document.querySelectorAll( '.main-nav a' ).length;
	console.log( `📊 В меню найдено ${totalLinks} ссылок` );

	// Проверяем ссылки на существование страниц (только в режиме разработки)
	if ( window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ) {
		document.querySelectorAll( '.main-nav a' ).forEach( link => {
			const href = link.getAttribute( 'href' );
			if ( href && !href.startsWith( '#' ) && !href.startsWith( 'javascript:' ) ) {
				// Проверяем, ведет ли ссылка на существующую страницу
				fetch( href, { method: 'HEAD' } )
					.catch( () => {
						console.warn( `⚠️ Ссылка может быть неактивна: ${href}` );
					} );
			}
		} );
	}
} );