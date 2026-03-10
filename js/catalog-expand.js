/**
 * ФУНКЦИОНАЛ РАЗВОРАЧИВАНИЯ КАТЕГОРИЙ ТОВАРОВ И ЗАГРУЗКИ ТОВАРОВ НА ГЛАВНУЮ
 * Для сайта "Комори" - азиатский магазинчик
 */

// ========== ФУНКЦИИ ДЛЯ ЗАГРУЗКИ ТОВАРОВ ==========

/**
 * Загрузка товаров на главную страницу в секцию products-scroll
 */
function loadProductsToCatalog() {
	const productsGrid = document.querySelector( '.products-scroll' );
	if ( !productsGrid ) return;

	const products = JSON.parse( localStorage.getItem( 'products' ) ) || [];

	// Сохраняем текущие товары, если они есть, для демо-режима
	const hasDemoProducts = productsGrid.children.length > 0 && products.length === 0;

	if ( products.length === 0 && !hasDemoProducts ) {
		// Если нет товаров, показываем демо-товары
		loadDemoProducts( productsGrid );
		return;
	} else if ( products.length === 0 && hasDemoProducts ) {
		// Если есть демо-товары, оставляем их
		return;
	}

	// Очищаем текущие товары
	productsGrid.innerHTML = '';

	// Добавляем товары из хранилища
	products.forEach( product => {
		if ( product.status === 'in-stock' && product.quantity > 0 ) {
			const productCard = createProductCard( product );
			productsGrid.appendChild( productCard );
		}
	} );

	// Если после фильтрации не осталось товаров, показываем демо
	if ( productsGrid.children.length === 0 ) {
		loadDemoProducts( productsGrid );
	}
}

/**
 * Загрузка демо-товаров для примера
 * @param {HTMLElement} container - контейнер для товаров
 */
function loadDemoProducts( container ) {
	// Демо-товары уже есть в HTML, просто убеждаемся что они отображаются
	console.log( 'Используются демо-товары' );
}

/**
 * Создание карточки товара из данных
 * @param {Object} product - объект товара
 * @returns {HTMLElement} - DOM элемент карточки
 */
function createProductCard( product ) {
	const card = document.createElement( 'div' );
	card.className = 'product-card';
	card.dataset.id = product.id;
	card.dataset.category = product.category;

	const discount = product.oldPrice > product.price
		? Math.round( ( 1 - product.price / product.oldPrice ) * 100 )
		: 0;

	// Определяем бейджи
	let badges = '';
	if ( product.isHit ) badges += '<span class="product-badge">Хит продаж</span>';
	if ( product.isNew ) badges += '<span class="product-badge new">Новинка</span>';
	if ( discount > 0 ) badges += `<span class="product-badge">-${discount}%</span>`;

	card.innerHTML = `
        <div class="product-image">
            <img src="${product.image || 'https://via.placeholder.com/300x200/e0e0e0/666666?text=Нет+фото'}" 
                 alt="${product.name}" 
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/300x200/e0e0e0/666666?text=Ошибка+загрузки'">
            ${badges}
        </div>
        <div class="product-content">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-description">${product.description || ''}</p>
            <div class="product-meta">
                <span class="product-price">${product.price.toLocaleString()} ₽</span>
                ${product.oldPrice > product.price
			? `<span class="product-old-price">${product.oldPrice.toLocaleString()} ₽</span>`
			: ''}
            </div>
            <button class="product-btn" onclick="window.productManager && productManager.addToCart('${product.id}')">
                В корзину
            </button>
        </div>
    `;

	return card;
}

/**
 * Получение названия категории по ключу
 * @param {string} categoryKey - ключ категории
 * @returns {string} - название категории
 */
function getCategoryName( categoryKey ) {
	const categories = {
		'figures': 'Аниме фигурки',
		'tea': 'Японский чай',
		'sweets': 'Азиатские сладости',
		'manga': 'Манга и книги',
		'clothing': 'Аниме одежда',
		'tableware': 'Японская посуда',
		'games': 'Японские игры',
		'stationery': 'Канцелярия кавай',
		'cosmetics': 'Косметика из Азии',
		'decor': 'Азиатский декор',
		'anime': 'Аниме на дисках',
		'music': 'Азиатская музыка',
		'other': 'Другое',
		'electronics': 'Электроника',
		'books': 'Книги'
	};
	return categories[categoryKey] || categoryKey;
}

/**
 * Обновление товаров при изменении в localStorage
 */
function setupProductsSync() {
	// Слушаем изменения в localStorage
	window.addEventListener( 'storage', ( e ) => {
		if ( e.key === 'products' ) {
			console.log( 'Товары обновлены в localStorage, перезагружаем...' );
			loadProductsToCatalog();
		}
	} );

	// Также можно создать кастомное событие для обновления
	window.addEventListener( 'productsUpdated', () => {
		loadProductsToCatalog();
	} );
}

// ========== КЛАСС ДЛЯ РАЗВОРАЧИВАНИЯ КАТЕГОРИЙ ==========

class CatalogExpander {
	constructor() {
		this.showAllBtn = document.querySelector( '.show-all-btn' );
		this.catalogGrid = document.querySelector( '.catalog-grid' );
		this.hiddenCategories = document.querySelectorAll( '.hidden-category' );
		this.isExpanded = false;

		this.init();
	}

	init() {
		// Загружаем товары в каталог
		loadProductsToCatalog();

		// Настраиваем синхронизацию
		setupProductsSync();

		if ( !this.showAllBtn || !this.catalogGrid ) return;

		// Устанавливаем начальное состояние
		this.setupInitialState();

		// Добавляем обработчик клика
		this.showAllBtn.addEventListener( 'click', ( e ) => this.toggleCategories( e ) );

		// Добавляем обработчик для анимации при прокрутке
		this.setupScrollAnimation();

		// Инициализируем анимацию элементов
		this.initCatalogAnimations();

		// Добавляем кнопку обновления товаров (для отладки, можно убрать)
		this.addRefreshButton();
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

// ========== ИНИЦИАЛИЗАЦИЯ ==========

// Загружаем товары при загрузке страницы
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

	// Добавляем возможность ручного обновления через консоль
	window.refreshProducts = loadProductsToCatalog;
} );

// Также загружаем товары после полной загрузки страницы
window.addEventListener( 'load', function () {
	// Небольшая задержка для уверенности
	setTimeout( loadProductsToCatalog, 100 );
} );