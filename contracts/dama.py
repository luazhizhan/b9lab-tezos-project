import smartpy as sp


class Dama(sp.Contract):
    def __init__(self, player1, player2):
        blackPieces = [
            sp.record(x=0, y=1, alive=True, isKing=False),
            sp.record(x=1, y=1, alive=True, isKing=False),
            sp.record(x=2, y=1, alive=True, isKing=False),
            sp.record(x=3, y=1, alive=True, isKing=False),
            sp.record(x=4, y=1, alive=True, isKing=False),
            sp.record(x=5, y=1, alive=True, isKing=False),
            sp.record(x=6, y=1, alive=True, isKing=False),
            sp.record(x=7, y=1, alive=True, isKing=False),
            sp.record(x=0, y=2, alive=True, isKing=False),
            sp.record(x=1, y=2, alive=True, isKing=False),
            sp.record(x=2, y=2, alive=True, isKing=False),
            sp.record(x=3, y=2, alive=True, isKing=False),
            sp.record(x=4, y=2, alive=True, isKing=False),
            sp.record(x=5, y=2, alive=True, isKing=False),
            sp.record(x=6, y=2, alive=True, isKing=False),
            sp.record(x=7, y=2, alive=True, isKing=False),
        ]
        redPieces = [
            sp.record(x=0, y=6, alive=True, isKing=False),
            sp.record(x=1, y=6, alive=True, isKing=False),
            sp.record(x=2, y=6, alive=True, isKing=False),
            sp.record(x=3, y=6, alive=True, isKing=False),
            sp.record(x=4, y=6, alive=True, isKing=False),
            sp.record(x=5, y=6, alive=True, isKing=False),
            sp.record(x=6, y=6, alive=True, isKing=False),
            sp.record(x=7, y=6, alive=True, isKing=False),
            sp.record(x=0, y=5, alive=True, isKing=False),
            sp.record(x=1, y=5, alive=True, isKing=False),
            sp.record(x=2, y=5, alive=True, isKing=False),
            sp.record(x=3, y=5, alive=True, isKing=False),
            sp.record(x=4, y=5, alive=True, isKing=False),
            sp.record(x=5, y=5, alive=True, isKing=False),
            sp.record(x=6, y=5, alive=True, isKing=False),
            sp.record(x=7, y=5, alive=True, isKing=False),
        ]
        self.init(
            player1=player1,
            player2=player2,
            recentPlayer=player2,  # Last player that made the move
            blackPieces=blackPieces,  # Player 1 pieces
            redPieces=redPieces,  # Player 2 pieces
            winner="",
            status=sp.record(
                moveTwoStep=False,
                validMove=False,
                isBlock=False,
                somethingToEat=0,
                eaten=False
            ),
            ended=False)

    @sp.entryPoint
    def playerMove(self, params):
        sp.verify(sp.sender != self.data.recentPlayer)
        sp.verify(~self.data.ended)

        # Player 2 (Red Pieces)
        sp.if self.data.player1 == self.data.recentPlayer:
            # Check if its a valid move
            self.validateMovePiece(self.data.redPieces, params)
            sp.verify(self.data.status.validMove)

            # Check for piece to eat
            self.checkForPieceToEat(self.data.redPieces, self.data.blackPieces, params, -1, 1, 1, -1, 0)

            sp.if self.data.status.somethingToEat >= 1:
                sp.verify(self.data.status.eaten)
            sp.else:
                sp.verify(~self.data.status.moveTwoStep)
                self.updateMovePiece(self.data.redPieces, params, 0)

            self.updateWinner(self.data.blackPieces, self.data.player2)
            
            sp.if self.data.status.somethingToEat <= 1:
                self.data.recentPlayer = self.data.player2

        # Player 1 (BlackPieces)
        sp.else:
            # Check if its a valid move
            self.validateMovePiece(self.data.blackPieces, params)
            sp.verify(self.data.status.validMove)
            
            # Check for piece to eat
            self.checkForPieceToEat(self.data.blackPieces, self.data.redPieces, params, 1, -1, -1, 1, 7)

            sp.if self.data.status.somethingToEat >= 1:
                sp.verify(self.data.status.eaten)
            sp.else:
                sp.verify(~self.data.status.moveTwoStep)
                self.updateMovePiece(self.data.blackPieces, params, 7)

            self.updateWinner(self.data.redPieces, self.data.player1)
            
            sp.if self.data.status.somethingToEat <= 1:
                self.data.recentPlayer = self.data.player1
        self.data.status.moveTwoStep = False
        self.data.status.somethingToEat = 0
        self.data.status.isBlock = False
        self.data.status.validMove = False
        self.data.status.eaten = False

    def validateMovePiece(self, myPieces, params):
        sp.for myPiece in myPieces:
            sp.if (myPiece.y == params.start_y) & (myPiece.x == params.start_x) & (~myPiece.isKing):
                diffX = params.target_x - params.start_x
                sp.if sp.sender == self.data.player1:
                    diffY = params.target_y - params.start_y
                    self.validateXYCords(diffX, diffY)
                sp.else:
                    diffY = params.start_y - params.target_y
                    self.validateXYCords(diffX, diffY)

    def validateXYCords(self, diffX, diffY):
        invalidMove = True
        sp.if (diffY <= 2) & (diffY >= 1) & (diffX == 0):
            sp.if (diffY == 2):
                self.data.status.moveTwoStep = True
            self.data.status.validMove = True
            invalidMove = False
        sp.if (diffX >= -2) & (diffX <= 2) & (diffY == 0):
            sp.if (diffX == 2) | (diffX == -2):
                self.data.status.moveTwoStep = True
            self.data.status.validMove = True
            invalidMove = False
        sp.if invalidMove:
            self.data.status.validMove = False

    def checkForPieceToEat(self, myPieces, opPieces, params, val1, val2, val3, val4, kingPlace):
        sp.for myPiece in myPieces:
            sp.for opPiece in opPieces:
                self.checkForPieceToEat2(
                    myPiece, opPiece, self.data.redPieces, params, val1, kingPlace)
                self.checkForPieceToEat2(
                    myPiece, opPiece, self.data.redPieces, params, val2, kingPlace)
                self.checkForPieceToEat3(myPiece, opPiece, opPieces, params, val3, val4, kingPlace)

    def checkForPieceToEat2(self, myPiece, opPiece, opPieces, params, value, kingPlace):
        sp.if (myPiece.x - opPiece.x == value) & (myPiece.y == opPiece.y):
            sp.for innerOpPiece in opPieces:
                sp.if (opPiece.x - innerOpPiece.x == value) & (myPiece.y == innerOpPiece.y) & (innerOpPiece.alive):
                    self.data.status.isBlock = True
            sp.if ~self.data.status.isBlock:
                self.data.status.somethingToEat = self.data.status.somethingToEat + 1
                diffX = myPiece.x - params.target_x
                sp.if (diffX == 2) | (diffX == -2) | (myPiece.isKing):
                    self.eatPiece(myPiece, opPiece, params, kingPlace)
                    
    def checkForPieceToEat3(self, myPiece, opPiece, opPieces, params, val1, val2, kingPlace):
        sp.if (myPiece.y - opPiece.y == val1) & (myPiece.x == opPiece.x):
            sp.for innerOpPiece in opPieces:
                sp.if (innerOpPiece.y - opPiece.y == val2) & (innerOpPiece.x == opPiece.x) & (innerOpPiece.alive):
                    self.data.status.isBlock = True
            sp.if ~self.data.status.isBlock:
                self.data.status.somethingToEat = self.data.status.somethingToEat + 1
                diffY = myPiece.y - params.target_y
                sp.if (diffY == 2) | (diffY == -2) | (myPiece.isKing):
                    self.eatPiece(myPiece, opPiece, params, kingPlace)

    def eatPiece(self, myPiece, opPiece, params, kingPlace):
        sp.if (myPiece.y == params.start_y) & (myPiece.x == params.start_x):
            opPiece.alive = False
            myPiece.x = params.target_x
            myPiece.y = params.target_y
            self.data.status.eaten = True
            sp.if myPiece.y == kingPlace:
                myPiece.isKing = True

    def updateMovePiece(self, myPieces, params, kingPlace):
        sp.for myPiece in myPieces:
            sp.if (myPiece.y == params.start_y) & (myPiece.x == params.start_x):
                myPiece.x = params.target_x
                myPiece.y = params.target_y
                sp.if myPiece.y == kingPlace:
                    myPiece.isKing = True

    def updateWinner(self, opPieces, winner):
        allDead = True
        sp.for opPiece in opPieces:
            sp.if opPiece.alive == True:
                allDead = False
        sp.if allDead:
            sp.if winner == self.data.player1:
                self.data.winner = "player1"
            sp.else:
                self.data.winner = "player2"
            self.data.ended = True


@addTest(name="Scenario1")
def test1():
    player1 = sp.address("tz1QXAD77BSjuD9W4AFq8rPTN1dk1gsDjYVG")
    player2 = sp.address("tz1SaSyYcuPB1EoMHkC4fx9y6HwipWMAq8e7")

    contract = Dama(player1, player2)
    scenario = sp.testScenario()
    scenario += contract
    
    scenario += contract.playerMove(start_x=4, start_y=1,
                                    target_x=4, target_y=0).run(sender=player1,valid = False) # will fail (Invalid move)
                                    
    scenario += contract.playerMove(start_x=4, start_y=2,
                                    target_x=4, target_y=3).run(sender=player1)

    scenario += contract.playerMove(start_x=2, start_y=5,
                                    target_x=2, target_y=3).run(sender=player2,valid = False)

    scenario += contract.playerMove(start_x=4, start_y=5,
                                    target_x=4, target_y=4).run(sender=player2)

    scenario += contract.playerMove(start_x=5, start_y=2,
                                    target_x=5, target_y=3).run(sender=player1,valid = False) # will fail (need to eat, but never eat)

    scenario += contract.playerMove(start_x=4, start_y=3,
                                    target_x=4, target_y=5).run(sender=player1)

    scenario += contract.playerMove(start_x=3, start_y=6,
                                    target_x=3, target_y=5).run(sender=player2,valid = False) # will fail (need to eat, but never eat)

    scenario += contract.playerMove(start_x=4, start_y=6,
                                    target_x=4, target_y=4).run(sender=player2)
    html = contract.fullHtml()
    setOutput(html)
