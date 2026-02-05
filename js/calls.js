// Обработка звонков и модального окна
document.addEventListener( 'DOMContentLoaded', function () {
	// Элементы модального окна
	const callbackBtn = document.getElementById( 'callbackBtn' );
	const callbackModal = document.getElementById( 'callbackModal' );
	const closeModal = document.querySelector( '.close-modal' );
	const callbackForm = document.getElementById( 'callbackForm' );

	// Функция открытия модального окна
	function openModal() {
		if ( callbackModal ) {
			callbackModal.style.display = 'block';
			// Фокусируемся на первом поле формы
			const firstInput = callbackForm ? callbackForm.querySelector( 'input' ) : null;
			if ( firstInput ) {
				setTimeout( () => firstInput.focus(), 100 );
			}
		}
	}

	// Функция закрытия модального окна
	function closeModalFunc() {
		if ( callbackModal ) {
			callbackModal.style.display = 'none';
		}
	}

	// Открытие модального окна по кнопке
	if ( callbackBtn ) {
		callbackBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			openModal();
		} );
	}

	// Закрытие модального окна по крестику
	if ( closeModal ) {
		closeModal.addEventListener( 'click', closeModalFunc );
	}

	// Закрытие модального окна при клике вне его
	window.addEventListener( 'click', function ( e ) {
		if ( callbackModal && e.target === callbackModal ) {
			closeModalFunc();
		}
	} );

	// Закрытие модального окна по клавише Escape
	document.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'Escape' && callbackModal && callbackModal.style.display === 'block' ) {
			closeModalFunc();
		}
	} );

	// Обработка формы заказа звонка
	if ( callbackForm ) {
		callbackForm.addEventListener( 'submit', function ( e ) {
			e.preventDefault();

			// Получаем данные формы
			const nameInput = this.querySelector( 'input[type="text"]' );
			const phoneInput = this.querySelector( 'input[type="tel"]' );

			const name = nameInput ? nameInput.value.trim() : '';
			const phone = phoneInput ? phoneInput.value.trim() : '';

			// Простая валидация
			if ( !name || !phone ) {
				alert( 'Пожалуйста, заполните все поля' );
				return;
			}

			// Проверка формата телефона (простая)
			const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
			if ( !phoneRegex.test( phone ) ) {
				alert( 'Пожалуйста, введите корректный номер телефона' );
				phoneInput.focus();
				return;
			}

			// В реальном проекте здесь будет отправка на сервер
			console.log( 'Заказ звонка:', { name, phone, timestamp: new Date().toISOString() } );

			// Показываем сообщение об успехе
			alert( `Спасибо, ${name}! Мы перезвоним вам по номеру ${phone} в ближайшее время.` );

			// Закрываем модальное окно
			closeModalFunc();

			// Сбрасываем форму
			this.reset();

			// Отправка данных на сервер (заглушка)
			// sendCallbackRequest(name, phone);
		} );

		// Маска для телефона (простая версия)
		const phoneInput = callbackForm.querySelector( 'input[type="tel"]' );
		if ( phoneInput ) {
			phoneInput.addEventListener( 'input', function ( e ) {
				let value = this.value.replace( /\D/g, '' );

				// Простая маска: +7 (XXX) XXX-XX-XX
				if ( value.length > 0 ) {
					if ( value[0] === '7' || value[0] === '8' ) {
						value = value.substring( 1 );
					}

					let formatted = '+7 (';
					if ( value.length > 0 ) formatted += value.substring( 0, 3 );
					if ( value.length > 3 ) formatted += ') ' + value.substring( 3, 6 );
					if ( value.length > 6 ) formatted += '-' + value.substring( 6, 8 );
					if ( value.length > 8 ) formatted += '-' + value.substring( 8, 10 );

					this.value = formatted;
				}
			} );

			// Сохраняем позицию курсора
			phoneInput.addEventListener( 'keydown', function ( e ) {
				if ( e.key === 'Backspace' || e.key === 'Delete' ) {
					// Запоминаем позицию курсора для корректного удаления
					this.dataset.selectionStart = this.selectionStart;
				}
			} );
		}
	}

	// Функция отправки данных на сервер (заглушка)
	function sendCallbackRequest( name, phone ) {
		// В реальном приложении здесь будет fetch или XMLHttpRequest
		console.log( 'Отправка данных на сервер:', { name, phone } );

		// Имитация отправки
		setTimeout( () => {
			console.log( 'Данные успешно отправлены на сервер' );
		}, 1000 );
	}

	// Клик по номерам телефонов в шапке (если нужна отдельная логика)
	document.querySelectorAll( '.phone-numbers span' ).forEach( phoneSpan => {
		phoneSpan.addEventListener( 'click', function () {
			const phoneText = this.textContent.replace( /[^\d\+]/g, '' ).trim();
			console.log( 'Клик по телефону:', phoneText );

			// Можно открыть модальное окно или сразу набрать номер
			// window.location.href = `tel:${phoneText}`;
		} );
	} );

	console.log( 'Модуль обработки звонков загружен' );
} );