// Бургер-меню - отдельный модуль
document.addEventListener( 'DOMContentLoaded', function () {
	const burgerMenu = document.getElementById( 'burgerMenu' );
	const mainNav = document.getElementById( 'mainNav' );
	const navOverlay = document.getElementById( 'navOverlay' );
	const burgerIcon = burgerMenu ? burgerMenu.querySelector( '.burger-icon' ) : null;
	const catalogLink = document.querySelector( '.has-dropdown > .nav-link' );

	if ( !burgerMenu || !mainNav || !burgerIcon || !navOverlay ) {
		console.error( 'Элементы бургер-меню не найдены' );
		return;
	}

	// Функция открытия меню
	function openMenu() {
		mainNav.classList.add( 'active' );
		burgerMenu.classList.add( 'active' );
		navOverlay.classList.add( 'active' );
		document.body.style.overflow = 'hidden'; // Блокируем скролл
		document.documentElement.style.overflow = 'hidden'; // Блокируем скролл для html
	}

	// Функция закрытия меню
	function closeMenu() {
		mainNav.classList.remove( 'active' );
		burgerMenu.classList.remove( 'active' );
		navOverlay.classList.remove( 'active' );
		document.body.style.overflow = ''; // Разблокируем скролл
		document.documentElement.style.overflow = ''; // Разблокируем скролл для html
	}

	// Функция переключения меню
	function toggleMenu() {
		if ( mainNav.classList.contains( 'active' ) ) {
			closeMenu();
		} else {
			openMenu();
		}
	}

	// Обработчик клика на бургер-меню
	burgerMenu.addEventListener( 'click', function ( e ) {
		e.preventDefault();
		e.stopPropagation();
		toggleMenu();
	} );

	// Обработчик клика на оверлей
	navOverlay.addEventListener( 'click', function ( e ) {
		e.preventDefault();
		closeMenu();
	} );

	// Обработчик для Каталога (открытие подменю на мобильных)
	if ( catalogLink ) {
		catalogLink.addEventListener( 'click', function ( e ) {
			if ( window.innerWidth <= 768 ) {
				e.preventDefault();
				e.stopPropagation();

				const catalogItem = this.closest( '.has-dropdown' );
				const dropdown = catalogItem.querySelector( '.dropdown-menu' );

				if ( dropdown ) {
					dropdown.classList.toggle( 'active' );
				}
			}
		} );
	}

	// Для остальных пунктов меню - закрываем меню при клике
	document.querySelectorAll( '.nav-list > li:not(.has-dropdown) > .nav-link' ).forEach( link => {
		link.addEventListener( 'click', function ( e ) {
			if ( window.innerWidth <= 768 ) {
				e.preventDefault();

				// Закрываем меню
				closeMenu();

				// Если это ссылка на акции, прокручиваем к акциям
				if ( this.classList.contains( 'promo-link' ) ) {
					setTimeout( () => {
						const promoSection = document.querySelector( '.promo-section' );
						if ( promoSection ) {
							window.scrollTo( {
								top: promoSection.offsetTop - 100,
								behavior: 'smooth'
							} );
						}
					}, 300 );
				}
			}
		} );
	} );

	// Обработка кликов по подменю каталога
	document.querySelectorAll( '.dropdown-menu a' ).forEach( link => {
		link.addEventListener( 'click', function ( e ) {
			if ( window.innerWidth <= 768 ) {
				e.preventDefault();

				const itemName = this.textContent.trim();
				alert( 'Вы выбрали: ' + itemName + '\nВ реальном приложении здесь будет переход к выбранной категории.' );

				closeMenu();
			}
		} );
	} );

	// Закрытие меню по клавише Escape
	document.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'Escape' && mainNav.classList.contains( 'active' ) ) {
			closeMenu();
		}
	} );

	// Закрытие меню при изменении размера окна
	window.addEventListener( 'resize', function () {
		if ( window.innerWidth > 768 ) {
			closeMenu();
		}
	} );

	// Предотвращаем закрытие при клике внутри меню
	mainNav.addEventListener( 'click', function ( e ) {
		e.stopPropagation();
	} );

	console.log( 'Бургер-меню инициализировано' );
} );