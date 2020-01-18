import { Injectable } from '@angular/core';
import { DamaContract } from './contract';
import { DamaStorage } from './storage';
import { Dama } from '../../interfaces/dama';
import {
  TezosConseilClient, TezosNodeWriter,
  TezosParameterFormat, TezosContractIntrospector
} from 'ConseilJS';

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  tezosNode = 'https://api.tezos.id/babylonnet';
  conseilServer = {
    url: 'https://conseil-dev.cryptonomic-infra.tech',
    apiKey: 'b9labs',
    network: 'babylonnet'
  };
  player1KeyStore = {
    publicKey: 'edpkv1ydNkXn6jHmjRiKKNDGp9W5bK4iru1yctwSp4WSLAiswFnJ83',
    privateKey: 'edskRgwMYqabjetY3Mm1TcWu7gEFhq13qw3D9gzsReLcAn9vcsXGs4WPgYTTHY4y7KLNdrhSBQkrqe5Rc1FoBY8W4CpnvimN3R',
    publicKeyHash: 'tz1QXAD77BSjuD9W4AFq8rPTN1dk1gsDjYVG',
    seed: '',
    storeType: 1
  };
  player2KeyStore = {
    publicKey: 'edpkv4fnXSVG9izj1ipQ2vTkReLEaFfdo73hnSyDCLDtuwBXH6BMPH',
    privateKey: 'edskS8Aw8EFNkjwVYurX4jn7hSL8wvXmP5pb4EJtijW6tcMMdJFftbd1fUsYrjYEzQ7Zc8uH3odS4ZrvgWQ6SikVoUz1URXEJR',
    publicKeyHash: 'tz1SaSyYcuPB1EoMHkC4fx9y6HwipWMAq8e7',
    seed: '',
    storeType: 1
  };

  constructor() { }

  async deployContract(): Promise<string> {
    const contract = DamaContract;
    const storage = DamaStorage;
    const nodeResult = await TezosNodeWriter.sendContractOriginationOperation(this.tezosNode,
      this.player1KeyStore, 0, undefined, 600000, '', 60000, 800000, contract, storage,
      TezosParameterFormat.Micheline);
    console.log(nodeResult);
    const groupid = nodeResult.operationGroupID.replace(/\'/g, '').replace(/\n/, ''); // clean up RPC output
    return groupid;
  }

  async awaitOperationConfirmation(groupid: string): Promise<any> {
    const conseilResult = await TezosConseilClient.awaitOperationConfirmation(this.conseilServer, 'babylonnet', groupid, 5);
    return conseilResult[0].originated_contracts;
  }

  async invokeContract(currentPlayer: number, contractAddress: string,
                       start_x: number, start_y: number, target_x: number, target_y: number): Promise<string> {
    const keystore = currentPlayer === 1 ? this.player1KeyStore : this.player2KeyStore;
    const params = `(Pair (Pair (Pair ${start_x} ${start_y}) ${target_x}) ${target_y})`;
    const result = await TezosNodeWriter.sendContractInvocationOperation(this.tezosNode, keystore,
      contractAddress, 0, 100000, '', 10000, 800000, undefined, params, TezosParameterFormat.Michelson);
    return result.operationGroupID;
  }

  async interrogateContract(): Promise<void> {
    const contractParameters = `parameter (pair (pair (pair (int %start_x) (int %start_y)) (int %target_x)) (int %target_y));`;
    const entryPoints = TezosContractIntrospector.generateEntryPointsFromParams(contractParameters);
    console.table(entryPoints);
  }

  getSelectedPiece(damaBoard: Dama[][]): Dama {
    let dama: Dama;
    damaBoard.forEach(damaRow => {
      const fDamaRow = damaRow.filter(fDamaPiece => fDamaPiece.selected === true);
      if (fDamaRow.length > 0) {
        dama = fDamaRow[0];
      }
    });
    return dama;
  }

  getPieceFromContractStorage(pieces: any, player: number, keyX: string, yCord: string) {
    let thePiece = { player: null, img: null, selected: false, x: null, y: null, isKing: null };
    const img = player === 1 ?
      '../../../assets/images/black-piece.png' :
      '../../../assets/images/red-piece.png';
    const kingImg = player === 1 ?
      '../../../assets/images/black-king-piece.png' :
      '../../../assets/images/red-king-piece.png';
    for (const key in pieces) {
      const piece = pieces[key];
      if (piece.x === keyX && piece.y === yCord && piece.alive === true) {
        thePiece = {
          player,
          img,
          x: parseInt(keyX),
          y: parseInt(yCord),
          selected: false,
          isKing: false
        };
        if (piece.isKing) {
          piece.isKing = true;
          piece.img = kingImg;
        }
      }
    }
    return thePiece;
  }

  getYCordFromBoardRowIndex(rowIndex: number) {
    switch (rowIndex) {
      case 7:
        return 0;
      case 6:
        return 1;
      case 5:
        return 2;
      case 4:
        return 3;
      case 3:
        return 4;
      case 2:
        return 5;
      case 1:
        return 6;
      case 0:
        return 7;
    }
  }
}
