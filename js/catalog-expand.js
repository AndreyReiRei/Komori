/**
 * ФУНКЦИОНАЛ РАЗВОРАЧИВАНИЯ КАТЕГОРИЙ ТОВАРОВ
 * Для сайта "Комори" - азиатский магазинчик
 */

class CatalogExpander {
	constructor() {
		this.showAllBtn = document.querySelector( '.show-all-btn' );
		this.catalogGrid = document.querySelector( '.catalog-grid' );
		this.hiddenCategories = document.querySelectorAll( '.hidden-category' );
		this.isExpanded = false;

		this.init();
	}

	init() {
		if ( !this.showAllBtn || !this.catalogGrid ) return;

		// Устанавливаем начальное состояние
		this.setupInitialState();

		// Добавляем обработчик клика
		this.showAllBtn.addEventListener( 'click', ( e ) => this.toggleCategories( e ) );

		// Добавляем обработчик для анимации при прокрутке
		this.setupScrollAnimation();

		// Инициализируем анимацию элементов
		this.initCatalogAnimations();
	}

	setupInitialState() {
		// Устанавливаем начальные стили для скрытых категорий
		this.hiddenCategories.forEach( item => {
			item.style.opacity = '0';
			item.style.transform = 'translateY(20px)';
		} );

		// Добавляем анимацию fadeOut в CSS если её нет
		this.addFadeOutAnimation();
	}

	addFadeOutAnimation() {
		if ( !document.querySelector( '#fadeOutAnimation' ) ) {
			const style = document.createElement( 'style' );
			style.id = 'fadeOutAnimation';
			style.textContent = `
                @keyframes fadeOutDown {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(20px);
                        display: none;
                    }
                }
            `;
			document.head.appendChild( style );
		}
	}

	toggleCategories( e ) {
		e.preventDefault();

		if ( this.isExpanded ) {
			this.collapseCategories();
		} else {
			this.expandCategories();
		}

		this.isExpanded = !this.isExpanded;
	}

	expandCategories() {
		// Показываем дополнительные категории
		this.catalogGrid.classList.add( 'expanded' );
		this.showAllBtn.classList.add( 'expanded' );

		// Показываем скрытые элементы с задержкой
		this.hiddenCategories.forEach( ( item, index ) => {
			setTimeout( () => {
				item.style.display = 'block';
				// Запускаем анимацию
				requestAnimationFrame( () => {
					item.style.animation = 'fadeInUp 0.5s ease forwards';
				} );
			}, index * 100 );
		} );

		// Обновляем текст кнопки
		this.updateButtonText( 'Скрыть товары', 'fas fa-arrow-up' );

		// Прокручиваем к кнопке если она ушла за пределы экрана
		this.scrollToButtonIfNeeded();
	}

	collapseCategories() {
		// Скрываем дополнительные категории
		this.showAllBtn.classList.remove( 'expanded' );

		// Плавное скрытие элементов
		this.hiddenCategories.forEach( item => {
			item.style.animation = 'fadeOutDown 0.5s ease forwards';

			// После завершения анимации скрываем элемент
			setTimeout( () => {
				item.style.display = 'none';
				item.style.animation = '';
			}, 500 );
		} );

		// Удаляем класс expanded с задержкой чтобы анимация успела завершиться
		setTimeout( () => {
			this.catalogGrid.classList.remove( 'expanded' );
		}, 500 );

		// Обновляем текст кнопки
		this.updateButtonText( 'Показать все товары', 'fas fa-arrow-right' );

		// Прокрутка к началу блока
		this.scrollToCatalog();
	}

	updateButtonText( text, iconClass ) {
		const span = this.showAllBtn.querySelector( 'span' );
		const icon = this.showAllBtn.querySelector( 'i' );

		if ( span ) span.textContent = text;
		if ( icon ) icon.className = iconClass;
	}

	scrollToButtonIfNeeded() {
		const btnRect = this.showAllBtn.getBoundingClientRect();
		const windowHeight = window.innerHeight;

		// Если кнопка ушла за нижнюю границу экрана
		if ( btnRect.bottom > windowHeight ) {
			setTimeout( () => {
				this.showAllBtn.scrollIntoView( {
					behavior: 'smooth',
					block: 'center'
				} );
			}, 600 ); // Ждем пока появится весь контент
		}
	}

	scrollToCatalog() {
		setTimeout( () => {
			document.querySelector( '.catalog-preview' ).scrollIntoView( {
				behavior: 'smooth',
				block: 'start'
			} );
		}, 300 );
	}

	setupScrollAnimation() {
		// Автоматически показывать/скрывать кнопку при прокрутке
		window.addEventListener( 'scroll', () => {
			const catalogSection = document.querySelector( '.catalog-preview' );

			if ( catalogSection && this.showAllBtn ) {
				const sectionRect = catalogSection.getBoundingClientRect();
				const windowHeight = window.innerHeight;

				// Показываем кнопку только когда секция видна
				if ( sectionRect.top < windowHeight && sectionRect.bottom > 0 ) {
					this.showAllBtn.style.opacity = '1';
					this.showAllBtn.style.transform = 'translateY(0)';
				}
			}
		} );
	}

	initCatalogAnimations() {
		// Инициализация анимации при скролле для всех элементов каталога
		const catalogItems = document.querySelectorAll( '.catalog-preview .catalog-item' );

		if ( catalogItems.length > 0 ) {
			// Устанавливаем начальные стили для анимации
			catalogItems.forEach( item => {
				item.style.opacity = '0';
				item.style.transform = 'translateY(30px)';
				item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
			} );

			// Запускаем анимацию при загрузке
			this.animateOnScroll();

			// И при скролле
			window.addEventListener( 'scroll', () => this.animateOnScroll() );
		}
	}

	animateOnScroll() {
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
}

// Инициализация при загрузке документа
document.addEventListener( 'DOMContentLoaded', function () {
	// Создаем экземпляр класса
	const catalogExpander = new CatalogExpander();

	// Также инициализируем анимацию кнопки
	setTimeout( () => {
		const showAllBtn = document.querySelector( '.show-all-btn' );
		if ( showAllBtn ) {
			showAllBtn.style.opacity = '1';
			showAllBtn.style.transform = 'translateY(0)';
		}
	}, 1000 );

	// Добавляем глобальную ссылку для отладки (можно удалить в продакшене)
	window.catalogExpander = catalogExpander;
} );