/**
 * Сообщение с итогом игры
 */
const message = document.querySelector( 'main.result p' ) as HTMLParagraphElement;
/**
 * Кнопка перезапуска игры
 */
const restart = document.querySelector( ".button[ name = 'restart' ]" ) as HTMLButtonElement;

if ( !message || !restart )
{
	throw new Error( 'Can\'t find required elements on "result" screen' );
}

/**
 * Обновляет экран завершения игры
 * 
 * @param result Результат, с которым игра завершилась
 * @param points Количество набранных игроком очков
 */
function update( result: 'win' | 'loose' | 'abort', points?: number ): void
{
	restart.hidden = false;
	
	let text: string;
	
	switch ( result )
	{
		case 'win':
			text = 'You won! <br> Points gained: ' + points;
			break;
		
		case 'loose':
			text = 'You loose ;(';
			break;
		
		case 'abort':
			text = 'Someone has left?';
			restart.hidden = true;
			break;
		
		default:
			throw new Error( `Wrong game result "${result}"` );
	}
	
	message.innerHTML = text;
}

/**
 * Устанавливает обработчик перезапуска игры
 * 
 * @param listener Обработчик перезапуска игры
 */
function setRestartHandler( listener: ( event: MouseEvent ) => void ): void
{
	restart.addEventListener( 'click', listener );
}

export {
	update,
	setRestartHandler,
};
