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

	// Анимация при скролле для элементов каталога
	function animateOnScroll() {
		const catalogItems = document.querySelectorAll( '.catalog-preview .catalog-item' );

		catalogItems.forEach( item => {
			const itemPosition = item.getBoundingClientRect().top;
			const screenPosition = window.innerHeight / 1.3;

			if ( itemPosition < screenPosition ) {
				item.style.opacity = '1';
				item.style.transform = 'translateY(0)';
			}
		} );
	}

	// Инициализация анимации элементов каталога
	const catalogItems = document.querySelectorAll( '.catalog-preview .catalog-item' );
	if ( catalogItems.length > 0 ) {
		// Устанавливаем начальные стили для анимации
		catalogItems.forEach( item => {
			item.style.opacity = '0';
			item.style.transform = 'translateY(30px)';
			item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
		} );

		// Запускаем анимацию при загрузке
		setTimeout( animateOnScroll, 400 );

		// И при скролле
		window.addEventListener( 'scroll', animateOnScroll );
	}

	// Обработка кликов по элементам каталога на главной странице
	document.querySelectorAll( '.catalog-preview .catalog-item' ).forEach( item => {
		item.addEventListener( 'click', function () {
			const title = this.querySelector( 'h3' ).textContent;
			const description = this.querySelector( 'p' ).textContent;

			// Создаем модальное окно с информацией о категории
			const modal = document.createElement( 'div' );
			modal.className = 'modal';
			modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h2>${title}</h2>
                    <p>${description}</p>
                    <p>Здесь будет подробная информация о категории "${title}".</p>
                    <p>В реальном приложении здесь будет переход к товарам этой категории.</p>
                    <button class="modal-btn" onclick="this.closest('.modal').style.display='none'">Закрыть</button>
                </div>
            `;

			document.body.appendChild( modal );
			modal.style.display = 'block';

			// Обработчик закрытия
			modal.querySelector( '.close-modal' ).addEventListener( 'click', function () {
				modal.style.display = 'none';
				setTimeout( () => modal.remove(), 300 );
			} );

			// Закрытие по клику вне модального окна
			window.addEventListener( 'click', function ( e ) {
				if ( e.target === modal ) {
					modal.style.display = 'none';
					setTimeout( () => modal.remove(), 300 );
				}
			} );
		} );
	} );

	// Добавляем текущий год в футер
	const copyright = document.querySelector( '.copyright' );
	if ( copyright && copyright.textContent.includes( '2024' ) ) {
		const currentYear = new Date().getFullYear();
		copyright.innerHTML = copyright.innerHTML.replace( '2024', currentYear );
	}

	// Активация карточек при наведении (дополнительный эффект)
	document.querySelectorAll( '.catalog-preview .catalog-item' ).forEach( card => {
		card.addEventListener( 'mouseenter', function () {
			this.style.transform = 'translateY(-10px)';
			this.style.boxShadow = '0 20px 40px rgba(255, 183, 197, 0.25)';
		} );

		card.addEventListener( 'mouseleave', function () {
			if ( !this.classList.contains( 'hovered' ) ) {
				this.style.transform = 'translateY(0)';
			}
			this.style.boxShadow = '0 8px 20px rgba(255, 183, 197, 0.15)';
		} );
	} );


	// Закрытие бургер-меню при переходе по якорным ссылкам
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

	console.log( 'Сайт "Комори" загружен' );
} );