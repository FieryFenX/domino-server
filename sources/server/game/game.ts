import WebSocket from 'ws';
import { onError } from './on-error.js';

import type {
	AnyClientMessage,
	AnyServerMessage,
	GameStartedMessage,
	GameAbortedMessage,
} from '../../common/messages.js';

import type { Knuckle } from '../../common/knuckle';

/**
 * Класс игры
 * 
 * Запускает игровую сессию.
 */
class Game
{
	/**
	 * Количество игроков в сессии
	 */
	static readonly PLAYERS_IN_SESSION = 3;

	private _bazaarArr: Array < { value1: number, value2: number } > = [];

	private _bestValue!: { player: WebSocket, values: [ number | null, number ] };
	
	private _edgeKnuckles: Array < { knuckle: Knuckle, edge: 1 | 2} > = [];

	private _knuckles: Knuckle[] = [];

	private _skipCount: number = 0;

	/**
	 * Игровая сессия
	 */
	private _session: WebSocket[];
	/**
	 * Информация о ходах игроков
	 */
	private _playersState!: Map<WebSocket, boolean>;
	
	/**
	 * @param session Сессия игры, содержащая перечень соединений с игроками
	 */
	constructor( session: WebSocket[] )
	{
		this._session = session;
		
		this._sendStartMessage()
			.then(
				() =>
				{
					this._listenMessages();
				}
			)
			.catch( onError );

		this._construct();
	}

	private _construct(): void
	{
		this._bestValue = {
			player: this._session[0],
			values: [ null, -1 ],
		};
		
		for (let i = 0; i < 7; i++)
			for (let j = i; j < 7; j++)
				this._bazaarArr.push({ value1: i, value2: j });
		// shuffle
		for (let i = 27; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this._bazaarArr[i], this._bazaarArr[j]] = [this._bazaarArr[j], this._bazaarArr[i]];
		}
	}
	
	/**
	 * Уничтожает данные игровой сессии
	 */
	destroy(): void
	{
		// Можно вызвать только один раз
		this.destroy = () => {};
		
		for ( const player of this._session )
		{
			if (
				( player.readyState !== WebSocket.CLOSED )
				&& ( player.readyState !== WebSocket.CLOSING )
			)
			{
				const message: GameAbortedMessage = {
					type: 'gameAborted',
				};
				
				this._sendMessage( player, message )
					.catch( onError );
				player.close();
			}
		}
		
		// Обнуляем ссылки
		this._session = null as unknown as Game['_session'];
		this._playersState = null as unknown as Game['_playersState'];
		this._bazaarArr = null as unknown as Game['_bazaarArr'];
		this._bestValue = null as unknown as Game['_bestValue'];
		this._edgeKnuckles = null as unknown as Game['_edgeKnuckles'];
		this._knuckles = null as unknown as Game['_knuckles'];
		this._skipCount = null as unknown as Game['_skipCount'];
	}
	
	/**
	 * Отправляет сообщение о начале игры
	 */
	private _sendStartMessage(): Promise<void[]>
	{
		this._playersState = new Map();
		
		const data: GameStartedMessage = {
			type: 'gameStarted',
		};
		const promises: Promise<void>[] = [];
		
		for ( const player of this._session )
			promises.push( this._sendMessage( player, data ) );
		
		return Promise.all( promises );
	}
	
	/**
	 * Отправляет сообщение игроку
	 * 
	 * @param player Игрок
	 * @param message Сообщение
	 */
	private _sendMessage( player: WebSocket, message: AnyServerMessage ): Promise<void>
	{
		return new Promise(
			( resolve, reject ) =>
			{
				player.send(
					JSON.stringify( message ),
					( error ) =>
					{
						if ( error )
						{
							reject();
							
							return;
						}
						
						resolve();
					}
				)
			},
		);
	}
	
	/**
	 * Добавляет слушателя сообщений от игроков
	 */
	private _listenMessages(): void
	{
		for ( const player of this._session )
		{
			player.on(
				'message',
				( data ) =>
				{
					const message = this._parseMessage( data );
					
					this._processMessage( player, message );
				},
			);
			
			player.on( 'close', () => this.destroy() );
		}
	}
	
	/**
	 * Разбирает полученное сообщение
	 * 
	 * @param data Полученное сообщение
	 */
	private _parseMessage( data: unknown ): AnyClientMessage
	{
		if ( typeof data !== 'string' )
		{
			return {
				type: 'incorrectRequest',
				message: 'Wrong data type',
			};
		}
		
		try
		{
			return JSON.parse( data );
		}
		catch ( error )
		{
			return {
				type: 'incorrectRequest',
				message: 'Can\'t parse JSON data: ' + error,
			};
		}
	}
	
	/**
	 * Выполняет действие, соответствующее полученному сообщению
	 * 
	 * @param player Игрок, от которого поступило сообщение
	 * @param message Сообщение
	 */
	private _processMessage( player: WebSocket, message: AnyClientMessage ): void
	{
		switch ( message.type )
		{
			case 'startInfo':
				this._playersState.set( player, false );
				this._defineFirst( player, message.maxDouble, message.maxSum );
				if (this._playersState.size === Game.PLAYERS_IN_SESSION)
					this._sendStartStatus( this._bestValue.player );
				break;

			case 'playerRoll':
				this._onPlayerRoll( player, message.knuckle );
				break;

			case 'takeKnuckle':
				this._giveKnuckle( player );
				break;

			case 'result':
				if (this._skipCount >= 0) {
					this._skipCount = -1;
					this._sendEndMessage( player );
				}
				this._playersState.delete( player );
				this._defineWinner( player, message.valuesSum );
				if (this._playersState.size === 0)
					this._sendResultMessage( this._bestValue.player );
				break;
			
			case 'repeatGame':
				this._construct();
				this._knuckles = [];
				this._edgeKnuckles = [];
				this._skipCount = 0;
				this._sendStartMessage()
					.catch( onError );
				break;
			
			case 'incorrectRequest':
				this._sendMessage( player, message )
					.catch( onError );
				break;
			
			case 'incorrectResponse':
				console.error( 'Incorrect response: ', message.message );
				break;
			
			default:
				this._sendMessage(
					player,
					{
						type: 'incorrectRequest',
						message: `Unknown message type: "${(message as AnyClientMessage).type}"`,
					},
				)
					.catch( onError );
				break;
		}
	}
	
	private _giveKnuckle( player: WebSocket ): void
	{
		const knuckle = this._bazaarArr.pop();
		this._sendMessage(
			player,
			{
				type: 'giveKnuckle',
				knuckle: knuckle ? knuckle : null,
			}
		)
	}

	private _defineFirst( player: WebSocket, playerMaxDouble: number | null, playerMaxSum: number ): void
	{
		if ( !this._bestValue.values[0] || !playerMaxDouble ?
			 playerMaxDouble :
			 playerMaxDouble > this._bestValue.values[0] ) {
			this._bestValue.values[0] = playerMaxDouble;
			this._bestValue.player = player;
		}
		else if ( !this._bestValue.values[0] && playerMaxSum > this._bestValue.values[1] ) {
			this._bestValue.values[1] = playerMaxSum;
			this._bestValue.player = player;
		}
	}

	private _sendStartStatus( firstPlayer: WebSocket ): void
	{
		this._bestValue.values[0] = 300;
		this._bestValue.values[1] = 0;
		this._playersState.set( firstPlayer, true );

		this._sendMessage(
			firstPlayer,
			{
				type: 'changePlayer',
				myTurn: true,
				knuckle: null,
			},
		)
			.catch( onError );
		
		for ( const player of this._session )
			if (player != firstPlayer)
				this._sendMessage(
					player,
					{
						type: 'changePlayer',
						myTurn: false,
						knuckle: null,
					},
				)
					.catch( onError );
	}

	private _edgesConnect( knuckle1: number[], edge1: 2 | 1, knuckle2: number[], edge2: 2 | 1 ): boolean
	{
		const deltaX = Math.abs( knuckle1[ 2*edge1 ] - knuckle2[ 2*edge2 ] );
		const deltaY = Math.abs( knuckle1[ 2*edge1 + 1 ] - knuckle2[ 2*edge2 + 1 ] );
		if ( deltaX <= 1 && deltaY <= 1 && deltaX !== deltaY )
			return true;
		return false;
	}

	private _turnIsCorrect( knuckle: Knuckle ): boolean
	{
		const dataKnuckle = Object.values( knuckle );
		for ( let edgeKnuckle of this._edgeKnuckles ) {
			// for ( let kValue of [ knuckle.value1, knuckle.value2 ] )
			// 	for ( let ekValue of [ edgeKnuckle.value1, edgeKnuckle.value2 ] )
			// 		if ( kValue === ekValue ) {
			// 			const deltaX = Math.abs( knuckle.x1! - edgeKnuckle.x1! );
			// 			const deltaY = Math.abs( knuckle.y1! - edgeKnuckle.y1! );
			// 			if ( deltaX <= 1 && deltaY <= 1 && deltaX !== deltaY )
			// 				return true;
			// 		}
			const j = edgeKnuckle.edge;
			const dataEdgeKnuckle = Object.values( edgeKnuckle.knuckle );
			for ( const i of [ 1, 2 ] as (2 | 1)[] )
				if ( dataKnuckle[i-1] === dataEdgeKnuckle[j-1] ) {
					// const deltaX = Math.abs( dataKnuckle[ 2*(i+1) ] - dataEdgeKnuckle[ 2*j ] );
					// const deltaY = Math.abs( dataKnuckle[ 2*(i+1) + 1 ] - dataEdgeKnuckle[ 2*j + 1 ] );
					// console.log( deltaX, deltaY );
					if ( this._edgesConnect( dataKnuckle, i, dataEdgeKnuckle, j ) ) {
						if ( this._edgesConnect( dataKnuckle, 3-i as 2|1, dataEdgeKnuckle, 3-j as 2|1 ) )
							return false;
						for ( const chainKnuckle of this._knuckles )
							if ( chainKnuckle !== edgeKnuckle.knuckle )
								for ( const l of [ 1, 2 ] as (2 | 1)[] )
								for ( const k of [ 1, 2 ] as (2 | 1)[] )
									if ( this._edgesConnect( dataKnuckle, l, Object.values( chainKnuckle ), k ) )
										return false;
						edgeKnuckle.knuckle = knuckle;
						edgeKnuckle.edge = 3 - i as 2 | 1;
						return true;
					}
				}
		}
		return false;
	}

	/**
	 * Обрабатывает ход игрока
	 * 
	 * @param currentPlayer Игрок, от которого поступило сообщение
	 * @param currentPlayerKnuckle Костяшка, положенная игроком на поле
	 */
	private _onPlayerRoll( currentPlayer: WebSocket, currentPlayerKnuckle: Knuckle | null ): void
	{
		if ( this._playersState.get( currentPlayer ) != true )
		{
			this._sendMessage(
				currentPlayer,
				{
					type: 'incorrectRequest',
					message: 'Not your turn',
				},
			)
				.catch( onError );
			
			return;
		}
		
		if ( currentPlayerKnuckle === null) {
			if ( ++this._skipCount === Game.PLAYERS_IN_SESSION ) {
				this._skipCount = -1;
				this._sendEndMessage();
				return;
			}
		}
		else if ( this._edgeKnuckles.length === 0 ) {
			this._edgeKnuckles.push( { knuckle: currentPlayerKnuckle, edge: 1 } );
			this._edgeKnuckles.push( { knuckle: currentPlayerKnuckle, edge: 2 } );
			this._knuckles.push( currentPlayerKnuckle );
		}
		else {
			this._skipCount = 0;
			if ( !this._turnIsCorrect( currentPlayerKnuckle ) ) {
				this._sendMessage(
					currentPlayer,
					{
						type: 'incorrectRequest',
						message: 'Turn is incorrect',
					},
				)
					.catch( onError );
				
				return;
			}
			this._knuckles.push( currentPlayerKnuckle );
		}

		const nextPlayer = this._session[ (this._session.indexOf(currentPlayer) + 1) % Game.PLAYERS_IN_SESSION ];
		this._playersState.set( nextPlayer, true );
		this._sendMessage(
			nextPlayer,
			{
				type: 'changePlayer',
				myTurn: true,
				knuckle: currentPlayerKnuckle,
			},
		)
			.catch( onError );
		this._playersState.set( currentPlayer, false );
		this._sendMessage(
			currentPlayer,
			{
				type: 'changePlayer',
				myTurn: false,
				knuckle: null,
			},
		)
			.catch( onError );
		
		
		for ( const player of this._session )
		{	
			if ( player !== currentPlayer && player !== nextPlayer )
			{
				this._playersState.set( player, false );
				this._sendMessage(
					player,
					{
						type: 'changePlayer',
						myTurn: false,
						knuckle: currentPlayerKnuckle,
					},
				)
					.catch( onError );
			}
		}

		return;
	}

	private _sendEndMessage( ignorePlayer?: WebSocket ): void
	{
		for ( const player of this._session )
			if ( player !== ignorePlayer )
				this._sendMessage(
					player,
					{
						type: 'gameEnded',
					},
				)
					.catch( onError );
	}

	private _defineWinner( player: WebSocket, valuesSum: number ): void
	{
		if ( valuesSum < this._bestValue.values[0]! ) {
			this._bestValue.values[0] = valuesSum;
			this._bestValue.player = player;
		}
		this._bestValue.values[1] += valuesSum;
	}

	_sendResultMessage( winner: WebSocket ): void
	{
		for ( const player of this._session )
		{
			this._sendMessage(
				player,
				{
					type: 'gameResult',
					win: ( player === winner ),
					points: this._bestValue.values[1] - this._bestValue.values[0]!*2,
				},
			)
				.catch( onError );
		}
	}
}

export {
	Game,
};
