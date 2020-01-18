import { Component, OnInit } from '@angular/core';
import { ContractService } from '../../services/contract/contract.service';
import { TzstatsService } from '../../services/tzstats/tzstats.service';
import { Dama } from '../../interfaces/dama';

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.css']
})
export class StartComponent implements OnInit {
  title = 'dama';
  isLoading = false;
  started = false;
  pieceSelected = false;
  invokingContract = false;
  gameInfo = {
    contract: undefined,
    originated: undefined,
    player1: undefined,
    player2: undefined,
    currentPlayer: 1,
    winner: 'None'
  };
  logs = [];
  damaBoard: Dama[][] = [];

  constructor(
    private contractSvc: ContractService,
    private tzstatsSvc: TzstatsService
  ) { }

  ngOnInit() {
    const emptyRow = [];
    const blackRow1 = [];
    const blackRow2 = [];
    const redRow1 = [];
    const redRow2 = [];
    let key = 0;
    while (key < 8) {
      emptyRow.push({ player: null, img: null, selected: false, x: null, y: null, isKing: null });
      blackRow1.push({ player: 1, img: '../../../assets/images/black-piece.png', x: key, y: 1, selected: false, isKing: false });
      blackRow2.push({ player: 1, img: '../../../assets/images/black-piece.png', x: key, y: 2, selected: false, isKing: false });
      redRow1.push({ player: 2, img: '../../../assets/images/red-piece.png', x: key, y: 5, selected: false, isKing: false });
      redRow2.push({ player: 2, img: '../../../assets/images/red-piece.png', x: key, y: 6, selected: false, isKing: false });
      key++;
    }
    this.damaBoard.push(emptyRow);
    this.damaBoard.push(redRow2);
    this.damaBoard.push(redRow1);
    this.damaBoard.push(emptyRow);
    this.damaBoard.push(emptyRow);
    this.damaBoard.push(blackRow2);
    this.damaBoard.push(blackRow1);
    this.damaBoard.push(emptyRow);
  }

  async startGameClick() {
    if (this.started) {
      return alert("Game has started");
    }
    if (this.isLoading) {
      return alert("Game is loading...");
    }
    this.isLoading = true;
    this.logs.unshift('Deploying contract...');
    try {
      const groupId = await this.contractSvc.deployContract();
      this.logs.unshift('Operation Group Id: ' + groupId);
      this.logs.unshift('Waiting for contract address...');
      const contractAddr = await this.contractSvc.awaitOperationConfirmation(groupId);
      this.gameInfo = {
        contract: contractAddr,
        originated: 'tz1QXAD77BSjuD9W4AFq8rPTN1dk1gsDjYVG',
        player1: 'tz1QXAD77BSjuD9W4AFq8rPTN1dk1gsDjYVG',
        player2: 'tz1SaSyYcuPB1EoMHkC4fx9y6HwipWMAq8e7',
        currentPlayer: 1,
        winner: 'None'
      };
      this.logs.unshift('Contract deployed successfully');
      this.logs.unshift('View contract here: https://better-call.dev/babylon/' + contractAddr);
      this.started = true;
    } catch (err) {
      console.error(err);
      this.logs.unshift('Error in deploying contract');
    }
    this.isLoading = false;
  }

  async pieceClick(rowIndex: number, pieceIndex: number) {
    if (this.started === false) {
      return alert('Games has not started');
    }
    if (this.invokingContract) {
      return alert('Game is loading...');
    }
    if (this.gameInfo.winner !== 'None') {
      return alert('Game has ended. ' + this.gameInfo.winner + ' is the winner!');
    }

    const damaPiece = this.damaBoard[rowIndex][pieceIndex];
    if (damaPiece.img !== null && damaPiece.player === this.gameInfo.currentPlayer) {
      this.updateSelectedPiece(damaPiece);
    } else if (this.pieceSelected && damaPiece.img === null) {
      this.invokingContract = true;
      const grpId = await this.invokeDamaContract(rowIndex, pieceIndex);
      const formattedGrpId = grpId.substring(1, grpId.length - 2);
      this.logs.unshift('Operation Group Id: ' + formattedGrpId);
      this.logs.unshift('Awaiting operation results...');

      this.tzstatsSvc.getOperationEndPoint(formattedGrpId).subscribe(opResult => {
        this.invokingContract = false;
        const selDamaPiece = this.contractSvc.getSelectedPiece(this.damaBoard);
        this.updateSelectedPiece(selDamaPiece);
        if (opResult[0].errors === undefined) {
          this.logs.unshift('Updating game info...');
          const { blackPieces, recentPlayer, redPieces, winner } = opResult[0].storage.value;
          if (winner !== undefined) {
            winner === this.gameInfo.player1 ? 'Player 1' : 'Player 2';
          }
          recentPlayer === this.gameInfo.player1 ?
            this.gameInfo.currentPlayer = 2 :
            this.gameInfo.currentPlayer = 1;
          this.logs.unshift('Updating board...');
          const damaBoard = [];
          let keyY = 0;
          while (keyY < 8) {
            let keyX = 0;
            const damaRow = [];
            while (keyX < 8) {
              const yCord = this.contractSvc.getYCordFromBoardRowIndex(keyY);
              let piece: { player: any; img?: any; selected?: boolean; x?: any; y?: any; isKing?: any; };
              piece = this.contractSvc.getPieceFromContractStorage(blackPieces, 1, keyX.toString(),
                yCord.toString());
              if (piece.player === null) {
                piece = this.contractSvc.getPieceFromContractStorage(redPieces, 2, keyX.toString(),
                  yCord.toString());
              }
              damaRow.push(piece);
              keyX++;
            }
            damaBoard.push(damaRow);
            keyY++;
          }
          this.damaBoard = damaBoard;
          this.logs.unshift('Done! Player ' + this.gameInfo.currentPlayer + ' turn');
          this.logs.unshift('Go to https://better-call.dev/babylon/'
            + formattedGrpId + ' for more info');
        } else {
          const msg = 'Operation failed. Go to https://better-call.dev/babylon/'
            + formattedGrpId + ' for more info';
          this.logs.unshift(msg);
          alert(msg);
        }
      });
    } else {
      alert('Invalid move');
    }
  }

  async invokeDamaContract(rowIndex: number, pieceIndex: number): Promise<string> {
    const { currentPlayer, contract } = this.gameInfo;
    const selDamaPiece = this.contractSvc.getSelectedPiece(this.damaBoard);
    const yCord = this.contractSvc.getYCordFromBoardRowIndex(rowIndex);
    try {
      this.logs.unshift('Invoking contract...');
      return await this.contractSvc.invokeContract(currentPlayer, contract,
        selDamaPiece.x, selDamaPiece.y, pieceIndex, yCord);
    } catch (err) {
      console.error(err);
      this.logs.unshift('Error invoking contracting');
      return null;
    }
  }

  updateSelectedPiece(damaPiece: Dama) {
    if (!this.pieceSelected) {
      this.pieceSelected = true;
      damaPiece.selected = !damaPiece.selected;
    } else {
      this.damaBoard.forEach(fDamaRow => {
        fDamaRow.forEach(fDamaPiece => {
          if (fDamaPiece.selected && fDamaPiece.x === damaPiece.x &&
            fDamaPiece.y === damaPiece.y) {
            this.pieceSelected = false;
            damaPiece.selected = !damaPiece.selected;
          }
        });
      });
      if (this.pieceSelected) {
        alert('Invalid selection');
      }
    }
  }
}
