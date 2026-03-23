/**
 * Скрипт для поиска по сайту
 */

document.addEventListener( 'DOMContentLoaded', function () {
	const searchBtn = document.getElementById( 'searchBtn' );

	// Создаем модальное окно поиска (если его еще нет)
	createSearchModal();

	const searchModal = document.getElementById( 'searchModal' );
	const closeSearch = document.querySelector( '.close-search' );
	const searchInput = document.getElementById( 'searchInput' );
	const searchForm = document.getElementById( 'searchForm' );

	// Открытие поиска
	if ( searchBtn ) {
		searchBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			openSearch();
		} );
	}

	// Закрытие поиска
	if ( closeSearch ) {
		closeSearch.addEventListener( 'click', closeSearchFunc );
	}

	// Закрытие по клику вне модального окна
	window.addEventListener( 'click', function ( e ) {
		if ( searchModal && e.target === searchModal ) {
			closeSearchFunc();
		}
	} );

	// Закрытие по Escape
	document.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'Escape' && searchModal && searchModal.style.display === 'block' ) {
			closeSearchFunc();
		}
	} );

	// Обработка поиска
	if ( searchForm ) {
		searchForm.addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			const query = searchInput.value.trim();
			if ( query ) {
				performSearch( query );
			}
		} );
	}

	function openSearch() {
		if ( searchModal ) {
			searchModal.style.display = 'block';
			setTimeout( () => {
				if ( searchInput ) searchInput.focus();
			}, 300 );
			document.body.style.overflow = 'hidden';
		}
	}

	function closeSearchFunc() {
		if ( searchModal ) {
			searchModal.style.display = 'none';
			document.body.style.overflow = '';
			if ( searchInput ) searchInput.value = '';
		}
	}

	function performSearch( query ) {
		console.log( 'Поиск по запросу:', query );
		// Здесь будет логика поиска
		// Можно перенаправить на страницу результатов
		// window.location.href = `/search?q=${encodeURIComponent(query)}`;

		// Пока просто показываем уведомление
		alert( `Поиск: "${query}"\nФункция находится в разработке` );
		closeSearchFunc();
	}

	function createSearchModal() {
		// Проверяем, существует ли уже модальное окно поиска
		if ( document.getElementById( 'searchModal' ) ) return;

		const modalHTML = `
			<div id="searchModal" class="modal search-modal">
				<div class="modal-content search-modal-content">
					<div class="search-header">
						<h2><i class="fas fa-search"></i> Поиск по сайту</h2>
						<button class="close-search">&times;</button>
					</div>
					<form id="searchForm" class="search-form">
						<div class="search-input-wrapper">
							<i class="fas fa-search search-icon"></i>
							<input type="text" id="searchInput" placeholder="Введите название товара, категорию..." autocomplete="off">
							<button type="submit" class="search-submit-btn">Найти</button>
						</div>
					</form>
					<div class="search-suggestions">
						<p class="suggestions-title">Популярные запросы:</p>
						<div class="suggestions-tags">
							<span class="suggestion-tag">Аниме фигурки</span>
							<span class="suggestion-tag">Японский чай</span>
							<span class="suggestion-tag">Манга</span>
							<span class="suggestion-tag">Канцелярия</span>
							<span class="suggestion-tag">Косметика</span>
						</div>
					</div>
				</div>
			</div>
		`;

		document.body.insertAdjacentHTML( 'beforeend', modalHTML );

		// Добавляем обработчики для тегов
		document.querySelectorAll( '.suggestion-tag' ).forEach( tag => {
			tag.addEventListener( 'click', function () {
				const searchInput = document.getElementById( 'searchInput' );
				if ( searchInput ) {
					searchInput.value = this.textContent;
					document.getElementById( 'searchForm' ).dispatchEvent( new Event( 'submit' ) );
				}
			} );
		} );
	}
} );