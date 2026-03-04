/**
 * Скрипт для аккордеон-скролла с навигационными индикаторами
 * и автоматическим перелистыванием
 */

document.addEventListener( 'DOMContentLoaded', function () {
	// ===== ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ =====
	const container = document.querySelector( '.accordion-logo__container' ); // Контейнер с карточками
	const navDots = document.querySelectorAll( '.nav-dot' ); // Все индикаторы навигации
	const totalItems = navDots.length; // Общее количество слайдов

	// ===== СОСТОЯНИЯ =====
	let currentIndex = 0; // Текущий активный индекс
	let autoPlayInterval; // ID интервала автопрокрутки
	let isUserInteracting = false; // Флаг взаимодействия пользователя
	let isScrolling = false; // Флаг процесса прокрутки
	let scrollAnimationFrame; // Для requestAnimationFrame

	/**
	 * Обновляет активный индикатор на основе текущей позиции скролла
	 * Использует requestAnimationFrame для плавной синхронизации
	 */
	function updateActiveNav() {
		// Отменяем предыдущий запрос анимации
		if ( scrollAnimationFrame ) {
			cancelAnimationFrame( scrollAnimationFrame );
		}

		// Используем requestAnimationFrame для синхронизации с отрисовкой
		scrollAnimationFrame = requestAnimationFrame( () => {
			const scrollLeft = container.scrollLeft; // Текущая позиция скролла
			const itemWidth = container.clientWidth; // Ширина одного слайда

			// Вычисляем индекс на основе позиции скролла (без округления для плавности)
			// Используем пороговое значение 0.1 для более точного срабатывания
			const rawIndex = scrollLeft / itemWidth;
			const activeIndex = Math.round( rawIndex );

			// Проверяем, что индекс в допустимых пределах
			if ( activeIndex >= 0 && activeIndex < totalItems ) {
				// Обновляем текущий индекс
				currentIndex = activeIndex;

				// Обновляем классы индикаторов
				navDots.forEach( ( dot, index ) => {
					if ( index === activeIndex ) {
						dot.classList.add( 'active' );
					} else {
						dot.classList.remove( 'active' );
					}
				} );
			}
		} );
	}

	/**
	 * Переключает на следующий слайд (для автопрокрутки)
	 */
	function nextSlide() {
		// Не переключаем, если пользователь взаимодействует
		if ( isUserInteracting ) return;

		const itemWidth = container.clientWidth;
		let nextIndex = currentIndex + 1;

		// Зацикливаем: после последнего идем на первый
		if ( nextIndex >= totalItems ) {
			nextIndex = 0;
		}

		// Плавно прокручиваем к следующему слайду
		container.scrollTo( {
			left: itemWidth * nextIndex,
			behavior: 'smooth'
		} );

		// Индекс обновится в обработчике scroll, здесь не меняем
	}

	/**
	 * Запускает автопрокрутку
	 */
	function startAutoPlay() {
		// Очищаем существующий интервал
		if ( autoPlayInterval ) {
			clearInterval( autoPlayInterval );
		}
		// Запускаем новый интервал (5000 мс = 5 секунд)
		autoPlayInterval = setInterval( nextSlide, 5000 );
	}

	/**
	 * Останавливает автопрокрутку
	 */
	function stopAutoPlay() {
		if ( autoPlayInterval ) {
			clearInterval( autoPlayInterval );
			autoPlayInterval = null;
		}
	}

	/**
	 * Временно приостанавливает автопрокрутку при взаимодействии пользователя
	 */
	function pauseAutoPlay( duration = 2000 ) {
		stopAutoPlay();
		isUserInteracting = true;

		// Через указанное время возобновляем
		setTimeout( () => {
			isUserInteracting = false;
			startAutoPlay();
		}, duration );
	}

	// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====

	// 1. Обработчик прокрутки контейнера
	container.addEventListener( 'scroll', function () {
		// Обновляем индикаторы в реальном времени
		updateActiveNav();

		// Если это не программная прокрутка (вызванная setInterval)
		// и пользователь взаимодействует
		if ( !isUserInteracting ) {
			// Останавливаем автопрокрутку при ручной прокрутке
			stopAutoPlay();
			isUserInteracting = true;

			// Возобновляем через 2 секунды после остановки
			setTimeout( () => {
				isUserInteracting = false;
				startAutoPlay();
			}, 2000 );
		}
	} );

	// 2. Обработчик клика по индикаторам
	navDots.forEach( ( dot, index ) => {
		dot.addEventListener( 'click', function () {
			const itemWidth = container.clientWidth;

			// Прокручиваем к выбранному слайду
			container.scrollTo( {
				left: itemWidth * index,
				behavior: 'smooth'
			} );

			// При клике приостанавливаем автопрокрутку на 2 секунды
			pauseAutoPlay( 2000 );
		} );
	} );

	// 3. Обработчик окончания прокрутки (для синхронизации после инерции)
	container.addEventListener( 'scrollend', function () {
		// Финальное обновление индикаторов после полной остановки
		updateActiveNav();
	} );

	// 4. Обработчики для приостановки автопрокрутки при наведении на навигацию
	const navContainer = document.querySelector( '.custom-navigation' );

	navContainer.addEventListener( 'mouseenter', function () {
		stopAutoPlay();
		isUserInteracting = true;
	} );

	navContainer.addEventListener( 'mouseleave', function () {
		isUserInteracting = false;
		startAutoPlay();
	} );

	// 5. Обработчики для touch-устройств
	container.addEventListener( 'touchstart', function () {
		stopAutoPlay();
		isUserInteracting = true;
	} );

	container.addEventListener( 'touchend', function () {
		// Возобновляем через 2 секунды после касания
		setTimeout( () => {
			isUserInteracting = false;
			startAutoPlay();
		}, 2000 );
	} );

	// 6. Обработчик изменения размера окна
	window.addEventListener( 'resize', function () {
		// Обновляем индикаторы после изменения размера
		updateActiveNav();
	} );

	// ===== ИНИЦИАЛИЗАЦИЯ =====
	updateActiveNav(); // Устанавливаем начальный активный индикатор
	startAutoPlay(); // Запускаем автопрокрутку
} );

/**
 * КЛЮЧЕВЫЕ МОМЕНТЫ:
 * 
 * 1. Синхронизация индикаторов:
 *    - Используется requestAnimationFrame в updateActiveNav() для синхронизации с отрисовкой
 *    - Индикаторы обновляются в реальном времени при каждом событии scroll
 *    - Добавлен обработчик scrollend для финальной синхронизации
 * 
 * 2. Управление автопрокруткой:
 *    - Интервал 5000 мс (5 секунд)
 *    - Автоматически останавливается при любом взаимодействии пользователя
 *    - Возобновляется через 2 секунды после окончания взаимодействия
 * 
 * 3. Обработка пользовательского взаимодействия:
 *    - Клики по индикаторам
 *    - Ручная прокрутка
 *    - Наведение мыши
 *    - Касания на мобильных устройствах
 * 
 * 4. Плавность:
 *    - Использование behavior: 'smooth' для прокрутки
 *    - RequestAnimationFrame для визуальной синхронизации
 *    - Обработка инерционной прокрутки через scrollend
 */