import { openScreen } from './screens.js';
import * as GameScreen from './screens/game.js';
import * as ResultScreen from './screens/result.js';

GameScreen.setKnuckleTaker( knuckleTaker );
GameScreen.setTurnHandler( turnHandler );
GameScreen.setFinalizer( finalizer );
ResultScreen.setRestartHandler( restartHandler );

/**
 * Отправляет сообщение на сервер
 */
let sendMessage: typeof import( './connection.js' ).sendMessage;

/**
 * Устанавливает функцию отправки сообщений на сервер
 * 
 * @param sendMessageFunction Функция отправки сообщений
 */
function setSendMessage( sendMessageFunction: typeof sendMessage ): void
{
	sendMessage = sendMessageFunction;
}

/**
 * Обрабатывает ход игрока
 * 
 * @param knuckle Костяшка, положенная игроком на стол
 */
function turnHandler( knuckle: GameScreen.Knuckle | null ): void
{
	sendMessage( {
		type: 'playerRoll',
		knuckle,
	} );
}

/**
 * Отправляет запрос на взятие костяшки
 */
function knuckleTaker(): void {
	sendMessage( {
		type: 'takeKnuckle',
	} );
}

/**
 * Финализатор игры
 * 
 * @param valuesSum Сумма значений у игрока в руке
 */
function finalizer( valuesSum: number ): void
{
	sendMessage( {
		type: 'result',
		valuesSum: valuesSum,
	} );
}

/**
 * Обрабатывает перезапуск игры
 */
function restartHandler(): void
{
	sendMessage( {
		type: 'repeatGame',
	} );
}

/**
 * Начинает игру
 */
function startGame(): void
{
	openScreen( 'game' );
	for (let i = 0; i < 5; i++)
		sendMessage( {
			type: 'takeKnuckle',
		} );
	
	setTimeout( () => { 
		GameScreen.drawField();
		let [ maxDouble, maxSum ] = GameScreen.startInfo();
		sendMessage( {
			type: 'startInfo',
			maxDouble: maxDouble,
			maxSum: maxSum
		} );
	}, 10);
}

/**
 * Меняет активного игрока
 * 
 * @param myTurn Ход текущего игрока?
 * @param knuckle Костяшка, положенная последним игроком
 */
function changePlayer( myTurn: boolean, knuckle: GameScreen.Knuckle | null ): void
{
	GameScreen.update( myTurn, knuckle );
}

/**
 * Вставляет взятую из базара костяшку в руку
 * 
 * @param knuckle Костяшка, взятая из базара
 */
function insertTakenKnuckle( knuckle: GameScreen.Knuckle | null ): void
{
	if (knuckle === null) alert("No knuckles left");
	else GameScreen.insertKnuckle( knuckle.value1, knuckle.value2 );
}

/**
 * Отменяет ход игрока
 */
function cancelTurn(): void
{
	GameScreen.onCancel();
}

/**
 * Подсчитывает и отправляет результат игрока
 */
function result(): void
{
	GameScreen.countResult();
}

/**
 * Завершает игру
 * 
 * @param result Результат игры
 * @param points Набранные очки
 */
function endGame( result: 'win' | 'loose' | 'abort', points?: number ): void
{
	ResultScreen.update( result, points );
	openScreen( 'result' );
}

export {
	startGame,
	changePlayer,
	endGame,
	result,
	setSendMessage,
	insertTakenKnuckle,
	cancelTurn,
};
