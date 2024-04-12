# Panarchy ledger

### Simple UI

[withdrawUBI](https://evmconnector.dev/load/%28'a!'0x******.12'~f-%28'n!'withdrawUBI'~t!'nonpayable'~i3~o3%29%5D%29*...-!%5B.003-%5D%013.-*_)

### Full UI

[BitPeople](https://evmconnector.dev/load/%28'a!'0xJJJJJJ0010'~fM%28'n!'allowed_ZWWBapprove.9KZYbalanceOf_ZWBbordzVoteR*YclaimPT.Ycommit_W4Q-courtX.Ydispute.Ygenesis7MBgetCourt_KBgetPairGBhourGBjudge.9YlateShuffle.LnymX.YoptIn.YpairX_KLpziod7MBpzmits_Bpopulation_BpT_WLpseudonymEventGBquartz_BreassignCourt.YreassignNym.Ykz.QYkzed_Bkry_K49-revealHash.QYschedule7MBseed_Bshuffle.LtoSecondsGBtransfz.9KZYtransfzFrom.9WKZYvzify.4%5D%29%5D%29*MDuint256'%29-%5D%29%2C%28'n!'.RM4%5D~oM7'~t!'view'~i9Daddress'%29A%2CDuintB%5D~o*-D%28't!'G'~t!'pure'~i*J000000KA256'%29L4Dbool'%29-M!%5BQDbytes32'%29R'~t!'nonpayable'~iTroofOfUniqueHumanW%2C9XVzifiedY4-ZA8'%29_7*kregistzer%01zk_ZYXWTRQMLKJGDBA974.-*_)

[Election](https://evmconnector.dev/load/KaP0x888888Q11IfAKnPallocateSuffrageToken94-allowedNEECapprove3B-balanceOfNECGNB7-GLengthNCgenesis.ChalftimeN4KDbool'%29-period.Cschedule.CtoSecondsIDpureM*CH3B-HFrom3EB-vote34JJ*KDuint256'%29-J%2CKnP.IDviewM3974%5D~oA7KDaddress'%298QQQ9IDnonpayableMA!%5BB%2C*4C4*-DtPE%2C7GelectionHtransferI'~J%5D%29K%28'MIiAN.*P!'Q00%01QPNMKJIHGEDCBA98743.-*_)

[PAN](https://evmconnector.dev/load/XaQ0xCCCCCCY12'~fGXnQallowed-H4Japprove3HPbalanceOf-4JclaimedUBI-_Kdecimals-9W8VDgenesisjlegislature-*7_*.periodjschedulejsetTaxRate3Psymbol-9AstringVDtaxation3KtoSecondsLpureN*7*.totalSupplyjM3HPMFrom3HHPwithdrawUBI39ZZ*E%5D-LviewN.%29%2CXnQ3LnonpayableN4AaddressV7~oG9%5D7AXtQCYYYD%5D.EW256VG!%5BH4%2CJ9*.K49AboolVDL'~tQMtransferN'~iGP*7DQ!'V'%29WAuintX%28'Y00Z%5D%29_E%2Cj-J%01j_ZYXWVQPNMLKJHGEDCA9743.-*_)

[TaxVote](https://evmconnector.dev/load/qa!'0xDDDDDD0013'~fSqn!'MAX_LENGTH8*allocatez.7approve.9P7claimKs.7genesis8QAllowed-jQBalanceOf-QClaimedz-IqUbool'%29JgetW84QKrW-QKs-*period8*schedule8*setTaxRate.Y.9PYFrom.9jP7vote.4PPIZZ*I4J-84j.'~Unonpayable'~iS4qUuint256'%297IJ8'~Uview'~iS9qUaddress'%29D000000I%5D~oSJZ%2Cqn!'KVoteP%2C4Q*getS!%5BUt!'WNodeCountY7transferZ%5D%29j%2C9q%28'zKToken%01zqjZYWUSQPKJID9874.-*_)

### Bootstrap and RPC node

**RPC:** http://139.144.72.164:8545

**Enode:** "enode://191b522b7f9c0f331bfb0985de1c81c0dccf502386c9133ef0539987890b299b579acc95e5bb197a55c62308335c10ee7f91cb5b62ba59153a331e55861620fb@139.144.72.164:30303"

### Install

The engine interfaces with the Clique custom consensus engine interface (Clique has an "Authorize" method that Panarchy engine uses, as well as getters for block period. ) To install, replace the files in the Clique package in [core-geth](https://github.com/etclabscore/core-geth) with panarchy.go.
