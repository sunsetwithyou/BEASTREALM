import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Shield, Zap, Heart, Swords, Plus, Ban, X, HelpCircle, Clock, AlertTriangle, Copy, RotateCcw, Dice6, HandCoins, Minus, Loader2, MinusSquare, Skull, Trash2, Map, Trash } from 'lucide-react'; 
import { excelCards } from '../data/cardsData';

// *** 1. Firebase Connection ***
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, getDoc, runTransaction, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBlFZBi7MQWRl7uZZGrZPlTKmL559GN6mU",
  authDomain: "beastrealm-5a869.firebaseapp.com",
  projectId: "beastrealm-5a869",
  storageBucket: "beastrealm-5a869.firebasestorage.app",
  messagingSenderId: "987837920919",
  appId: "1:987837920919:web:c3062c31e5979a426e5bd2",
  measurementId: "G-KW7816QMR3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CARD_BACK_URL = "https://i.postimg.cc/05Y7vZYW/BG.jpg";

const generateCardImage = (name, type) => {
    return `https://placehold.co/400x300/2e1065/FFFFFF.png?text=${name.replace(/\s/g, '+')}&font=roboto`;
};

const isCardDefender = (card) => {
    if (!card) return false;
    return card.category === 'guard' || (card.description && card.description.includes('DEFENDER'));
};

const CardGamePrototype = () => {
  // --- Card Templates ---
  const cardTemplates = useMemo(
  () => excelCards.map((c) => ({ ...c, imageUrl: generateCardImage(c.name, c.type) })),
  []
);

  // --- State ---
  const [roomId, setRoomId] = useState(null); 
  const [myPlayerId, setMyPlayerId] = useState(null); 
  const [inputRoomId, setInputRoomId] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [cardIdCounter, setCardIdCounter] = useState(100); 
  const [showRules, setShowRules] = useState(false);
  const [localAttackingCard, setLocalAttackingCard] = useState(null);
  const [diceResult, setDiceResult] = useState(null); 
  const [isRolling, setIsRolling] = useState(false); 
  const [showCardDetail, setShowCardDetail] = useState(null); 
  const [copied, setCopied] = useState(false); 
  const [isVsAI, setIsVsAI] = useState(false);
  const [canEnterMatch, setCanEnterMatch] = useState(false);
  
  // *** State for Animation and Discard ***
  const [attackingId, setAttackingId] = useState(null); 
  const [discardCount, setDiscardCount] = useState(0); // Number of cards still required to discard
  const isAIProcessing = useRef(false); 

  // --- Helpers and Core Logic ---
  const shuffleCards = (cards) => [...cards].sort(() => Math.random() - 0.5);

  const drawFromDeckList = (deckList, count, startId) => {
    const hand = [];
    const nextDeck = [...deckList];
    let nextId = startId;
    for (let i = 0; i < count && nextDeck.length > 0; i += 1) {
      const topCard = nextDeck.shift();
      hand.push({ ...topCard, id: nextId, canAttack: false });
      nextId += 1;
    }
    return { hand, deckList: nextDeck, nextId };
  };

  const buildDeckForTribe = (tribe) => {
    const pool = cardTemplates.filter((card) => card.tribe === tribe);
    const pickByCategory = (category, count) => {
      const categoryCards = shuffleCards(pool.filter((card) => card.category === category));
      return categoryCards.slice(0, count).map((card) => ({ ...card }));
    };

    const deck = [
      ...pickByCategory('unit', 22),
      ...pickByCategory('spell', 6),
      ...pickByCategory('trap', 6),
      ...pickByCategory('guard', 6),
    ];
    return shuffleCards(deck);
  };

  const getBuffedStats = (card, currentFieldEffect, cardOwnerId) => {
      if (card.type !== 'unit') return { attack: card.attack, hp: card.hp };
      let buffAtk = 0;
      let buffHp = 0;
      if (currentFieldEffect && currentFieldEffect.targetTribe === card.tribe && currentFieldEffect.ownerId === cardOwnerId) {
          buffAtk += currentFieldEffect.buffAtk || 0;
          buffHp += currentFieldEffect.buffHp || 0;
      }
      return { attack: card.attack + buffAtk, hp: card.hp + buffHp, isBuffed: buffAtk > 0 || buffHp > 0 };
  };

  const getTrapDamage = (trapCard) => {
    if (!trapCard) return 0;
    if (typeof trapCard.effectValue === 'number') return trapCard.effectValue;
    const description = trapCard.description || '';
    const damageMatch = description.match(/(\d+)\s*(?:damage|dmg|ดาเมจ)/i) || description.match(/(?:deal|deals|สร้างความเสียหาย)\s*(\d+)/i);
    if (damageMatch) return Number(damageMatch[1]) || 0;
    return 0;
  };

  const getEffectDamage = (card) => {
    if (!card) return 0;
    if (typeof card.effectValue === 'number') return card.effectValue;
    return card.attack || 0;
  };

  const canUnitAttack = (card) => {
    if (!card) return false;
    return card.type === 'unit' && card.category !== 'guard';
  };

  const isFirstRoundNoDamage = (state) => {
    return (state?.turnNumber ?? 0) === 0;
  };

  const saveGame = async (newGameState) => {
    if (!roomId) return;
    if (!newGameState.winner) {
        let winner = null;
        if (newGameState.player1.hp <= 0) winner = 'player2';
        else if (newGameState.player2.hp <= 0) winner = 'player1';
        if (winner) {
            newGameState.message = "Game Over! " + (winner === myPlayerId ? "You Win!" : "You Lose!") + ` (${winner === 'player1' ? 'P1' : 'P2'} Wins)`;
            newGameState.winner = winner;
        }
    }
    try { await updateDoc(doc(db, "games", roomId), newGameState); } catch (error) { console.error(error); }
  };
  
  const closeRoom = async () => {
    if (!roomId) return;
    if (!window.confirm("Are you sure you want to close this room? Current game data will be deleted?")) return;
    setLoading(true);
    try {
        await deleteDoc(doc(db, "games", roomId));
        setRoomId(null);
        setGameState(null);
        setMyPlayerId(null);
    } catch (error) {
        console.error("Error closing room:", error);
        alert("Failed to close room.");
    }
    setLoading(false);
  };

  const returnToModeSelect = async () => {
    setLoading(true);
    try {
      if (roomId) {
        // Host can safely remove finished room so next match starts clean.
        if (myPlayerId === 'player1') {
          await deleteDoc(doc(db, "games", roomId));
        } else {
          // Non-host just leaves locally.
          await updateDoc(doc(db, "games", roomId), {
            player2: { ...(gameState?.player2 || {}), isOnline: false }
          });
        }
      }
    } catch (error) {
      console.error("Return to mode select error:", error);
    } finally {
      setRoomId(null);
      setGameState(null);
      setMyPlayerId(null);
      setInputRoomId('');
      setDiceResult(null);
      setIsRolling(false);
      setCanEnterMatch(false);
      setLoading(false);
    }
  };

  // *** AI Logic ***
  const handleAITurn = async (currentState) => {
      if (isAIProcessing.current) return;
      if (currentState.winner || currentState.currentTurn !== 'player2') return;
      
      isAIProcessing.current = true;

      try {
        let newState = JSON.parse(JSON.stringify(currentState));

        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // --- 1. Draw Phase ---
        if (!newState.hasDrawnThisTurn && newState.player2.deck > 0 && newState.player2.hand.length < 6) {
            const currentDeckList = newState.player2.deckList || [];
            if (currentDeckList.length > 0) {
                const newCard = { ...currentDeckList[0], id: newState.cardIdCounter, canAttack: false };
                newState.player2.hand.push(newCard);
                newState.player2.deckList = currentDeckList.slice(1);
                newState.player2.deck = newState.player2.deckList.length;
                newState.cardIdCounter += 1;
                newState.hasDrawnThisTurn = true;
                newState.message = "AI drew a card.";
                
                await saveGame(newState);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
               
        // --- 2. Action Loop ---
        let hasActionsLeft = true;
        while (hasActionsLeft && !newState.winner && newState.player1.hp > 0 && newState.player2.hp > 0) {
            hasActionsLeft = false;

            const playableCards = newState.player2.hand.filter(c => {
                if (c.cost > newState.player2.energy) return false;
                const isTrapOrSpell = c.type === 'spell' || c.type === 'trap';
                const isUnit = c.type === 'unit';
                const isSummonSpell = c.effect === 'summon_from_deck';
                const isDamageSpell = c.effect === 'damage_player';
                if (isFirstRoundNoDamage(newState) && isDamageSpell) return false;
                
                if (isTrapOrSpell && !['field_buff', 'summon_from_deck', 'heal_player', 'damage_player'].includes(c.effect) && newState.player2.field.traps.length >= 3) return false;
                if (isUnit && newState.player2.field.units.length >= 5) return false;
                if (isSummonSpell && newState.player2.field.units.length >= 5) return false;
                return true;
            });

            // AI units can attack even if ATK is 0
            const readyUnits = isFirstRoundNoDamage(newState)
              ? []
              : newState.player2.field.units.filter(u => u.canAttack && canUnitAttack(u));

            if (playableCards.length > 0 || readyUnits.length > 0) {
                hasActionsLeft = true; 
                const p1Units = newState.player1.field.units || [];
                const hasDirectPath = p1Units.length === 0;
                const totalReadyDirectDamage = readyUnits.reduce((sum, unit) => {
                    const s = getBuffedStats(unit, newState.fieldEffect, 'player2');
                    return sum + Math.max(0, s.attack || 0);
                }, 0);
                const playableBurnDamage = playableCards.reduce((sum, c) => {
                    if (c.effect !== 'damage_player') return sum;
                    return sum + Math.max(0, getEffectDamage(c));
                }, 0);
                const canLethalNow = hasDirectPath && (newState.player1.hp - (totalReadyDirectDamage + playableBurnDamage) <= 0);
                const underPressure = newState.player2.hp <= 10;

                let actionType = 'play';
                if (readyUnits.length > 0 && (canLethalNow || playableCards.length === 0)) {
                    actionType = 'attack';
                } else if (playableCards.length > 0) {
                    actionType = 'play';
                }

                if (actionType === 'play') {
                    const scorePlayableCard = (card) => {
                        let score = card.cost || 0;
                        if (card.type === 'unit') {
                            score += (card.attack || 0) + (card.hp || 0) * 0.5;
                            if (card.category === 'guard') score -= 3;
                            return score;
                        }
                        if (card.effect === 'damage_player') {
                            score += getEffectDamage(card) * 3;
                        } else if (card.effect === 'heal_player') {
                            score += underPressure ? (card.effectValue || 0) * 2.5 : -4;
                        } else if (card.effect === 'field_buff') {
                            const ownUnits = newState.player2.field.units.length;
                            score += ownUnits >= 2 ? 10 : 2;
                        } else if (card.effect === 'summon_from_deck') {
                            score += newState.player2.field.units.length < 5 ? 8 : -10;
                        } else if (card.type === 'trap') {
                            score += newState.player2.field.traps.length < 3 ? 4 : -8;
                        }
                        return score;
                    };

                    playableCards.sort((a, b) => scorePlayableCard(b) - scorePlayableCard(a));
                    const cardToPlay = playableCards[0];
                    const cardIndexInHand = newState.player2.hand.findIndex(c => c.id === cardToPlay.id);
                    
                    if (cardToPlay.type === 'spell' || cardToPlay.type === 'trap') {
                       if (cardToPlay.effect === 'field_buff') {
                           if (newState.fieldSpellCard) {
                               newState[newState.fieldSpellCard.ownerId].graveyard = newState[newState.fieldSpellCard.ownerId].graveyard || [];
                               newState[newState.fieldSpellCard.ownerId].graveyard.push(newState.fieldSpellCard);
                           }
                           newState.fieldEffect = { ...cardToPlay.effectConfig, ownerId: 'player2' };
                           newState.fieldSpellCard = { ...cardToPlay, ownerId: 'player2' };
                           newState.message = `AI activated Field: ${cardToPlay.name}`;
                       } else if (cardToPlay.effect === 'summon_from_deck') {
                           const dogTemplate = cardTemplates.find(c => c.tribe === 'Dog' && c.type === 'unit') || cardTemplates[0];
                           const token = { ...dogTemplate, id: newState.cardIdCounter++, canAttack: canUnitAttack(dogTemplate) ? newState.turnNumber >= 2 : false };
                           newState.player2.field.units.push(token);
                           newState.player2.graveyard = newState.player2.graveyard || [];
                           newState.player2.graveyard.push(cardToPlay);
                           newState.message = `AI summoned ${token.name}.`;
                       } else if (cardToPlay.effect === 'heal_player') {
                            newState.player2.hp = Math.min(20, newState.player2.hp + (cardToPlay.effectValue || 5));
                            newState.player2.graveyard = newState.player2.graveyard || [];
                            newState.player2.graveyard.push(cardToPlay);
                            newState.message = `AI healed ${cardToPlay.effectValue || 5} HP.`;
                       } else if (cardToPlay.effect === 'damage_player') {
                            const effectDmg = getEffectDamage(cardToPlay);
                            newState.player1.hp = Math.max(0, newState.player1.hp - effectDmg);
                            newState.player2.graveyard = newState.player2.graveyard || [];
                            newState.player2.graveyard.push(cardToPlay);
                            newState.message = `AI dealt ${effectDmg} damage to you.`;
                       } else {
                            newState.player2.field.traps.push({ ...cardToPlay, canAttack: false });
                            newState.message = `AI set a trap.`;
                       }
                    } else {
                        const canAttack = canUnitAttack(cardToPlay) ? newState.turnNumber >= 2 : false;
                        newState.player2.field.units.push({ ...cardToPlay, canAttack });
                        newState.message = `AI played ${cardToPlay.name}.`;
                    }
                    
                    newState.player2.energy -= cardToPlay.cost;
                    newState.player2.hand.splice(cardIndexInHand, 1);
                    
                    await saveGame(newState);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } 
                else if (actionType === 'attack') {
                    const sortedAttackers = [...readyUnits].sort((a, b) => {
                        const aStats = getBuffedStats(a, newState.fieldEffect, 'player2');
                        const bStats = getBuffedStats(b, newState.fieldEffect, 'player2');
                        return (bStats.attack || 0) - (aStats.attack || 0);
                    });
                    const attacker = sortedAttackers[0];
                    setAttackingId(attacker.id);
                    await new Promise(resolve => setTimeout(resolve, 400));

                    const attackerStats = getBuffedStats(attacker, newState.fieldEffect, 'player2');
                    const targets = newState.player1.field.units;
                    
                    let battleMsg = "";
                    let attackerNewHp = newState.player2.hp;

                    // Check trap reactions
                    let p1Traps = newState.player1.field.traps;
                    const triggeredTrap = p1Traps.find(c => c.type === 'trap');

                    if (triggeredTrap) {
                        const trapDmg = getTrapDamage(triggeredTrap);
                        attackerNewHp -= trapDmg; 
                        p1Traps = p1Traps.filter(t => t.id !== triggeredTrap.id); 
                        newState.player1.graveyard = newState.player1.graveyard || [];
                        newState.player1.graveyard.push(triggeredTrap); // Move triggered trap to graveyard
                        battleMsg = `Your trap triggered! AI took ${trapDmg} damage. `;
                        newState.player1.field.traps = p1Traps;
                    }

                    if (targets.length > 0) {
                        const defenderTargets = targets.filter(u => isCardDefender(u));
                        const validTargets = defenderTargets.length > 0 ? defenderTargets : targets;
                        const target = [...validTargets].sort((a, b) => {
                            const aStats = getBuffedStats(a, newState.fieldEffect, 'player1');
                            const bStats = getBuffedStats(b, newState.fieldEffect, 'player1');
                            const aEffHp = a.hp + (aStats.hp - a.hp);
                            const bEffHp = b.hp + (bStats.hp - b.hp);
                            const aKillable = attackerStats.attack >= aEffHp ? 1 : 0;
                            const bKillable = attackerStats.attack >= bEffHp ? 1 : 0;
                            if (aKillable !== bKillable) return bKillable - aKillable;
                            return (bStats.attack || 0) - (aStats.attack || 0);
                        })[0];
                         
                        const targetStats = getBuffedStats(target, newState.fieldEffect, 'player1');
                        // Recalculate lethal based on effective HP (with buffs)
                        const targetNewBaseHp = target.hp - attackerStats.attack;
                        const isDead = targetNewBaseHp + (targetStats.hp - target.hp) <= 0;
                        
                        if (isDead) {
                            newState.player1.field.units = newState.player1.field.units.filter(u => u.id !== target.id);
                            newState.player1.graveyard = newState.player1.graveyard || [];
                            newState.player1.graveyard.push(target); // Destroyed card goes to graveyard
                        } else {
                            newState.player1.field.units = newState.player1.field.units.map(u => u.id === target.id ? { ...u, hp: targetNewBaseHp } : u);
                        }
                        
                        const targetTypeMsg = isCardDefender(target) ? 'Defender' : 'Unit';
                        battleMsg += `AI ${attacker.name} attacked ${targetTypeMsg}: ${target.name}.`;
                    } else {
                        newState.player1.hp = Math.max(0, newState.player1.hp - attackerStats.attack);
                        battleMsg += `AI ${attacker.name} attacked you directly.`;
                    }

                    newState.player2.hp = Math.max(0, attackerNewHp);
                    newState.message = battleMsg;
                     
                    newState.player2.field.units = newState.player2.field.units.map(u => u.id === attacker.id ? { ...u, canAttack: false } : u);
                     
                    setAttackingId(null);
                    await saveGame(newState);
                    await new Promise(resolve => setTimeout(resolve, 1200));
                }
            }
        }
        
        // --- 3. End AI Turn (discard to hand limit) ---
        if (!newState.winner && newState.player1.hp > 0 && newState.player2.hp > 0 && newState.hasDrawnThisTurn) {
            
            // AI discards lowest-cost cards until hand size is 5
            while (newState.player2.hand.length > 5) {
                newState.player2.hand.sort((a, b) => a.cost - b.cost); 
                const discarded = newState.player2.hand.shift();
                newState.player2.graveyard = newState.player2.graveyard || [];
                newState.player2.graveyard.push(discarded);
            }

            const nextPlayer = 'player1';
            let newTurnNumber = newState.turnNumber;
            if (newState.startingPlayer) {
                if (nextPlayer === newState.startingPlayer) newTurnNumber += 1;
            } else {
                if (newState.currentTurn === 'player2') newTurnNumber += 1;
            }
            const calculatedMaxEnergy = Math.min(10, 2 + newTurnNumber);
            newState.currentTurn = nextPlayer;
            newState.turnNumber = newTurnNumber;
            newState.hasDrawnThisTurn = false;
            newState.player1.maxEnergy = calculatedMaxEnergy;
            newState.player1.energy = calculatedMaxEnergy;
            newState.player1.field.units = newState.player1.field.units.map(c => ({...c, canAttack: canUnitAttack(c)}));
            newState.message = `Your turn (Round ${newTurnNumber})`;
            
            await saveGame(newState);
        }
      } catch (error) {
        console.error("AI Error", error);
      } finally {
        isAIProcessing.current = false;
      }
  };

  const createRoom = async (vsAI = false) => {
    setLoading(true);
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase(); 
    const p2Online = vsAI;

    const fullDeckP1 = buildDeckForTribe('Cat');
    const fullDeckP2 = buildDeckForTribe('Dog');
    const initialP1 = drawFromDeckList(fullDeckP1, 5, 1);
    const initialP2 = drawFromDeckList(fullDeckP2, 5, 1000);
    const initialCardCounter = Math.max(initialP1.nextId, initialP2.nextId, 200);

    const initialGameState = {
      turnNumber: 0, currentTurn: null, cardIdCounter: initialCardCounter, winner: null,
      message: vsAI ? 'VS AI mode: roll dice to start.' : 'Waiting for Player 2 to join...',
      dice: { player1: null, player2: null, status: vsAI ? 'ready' : 'waiting' }, 
      hasDrawnThisTurn: false,
      fieldEffect: null, fieldSpellCard: null,
      player1: { hp: 20, energy: 0, maxEnergy: 3, deck: initialP1.deckList.length, deckList: initialP1.deckList, hand: initialP1.hand, field: { units: [], traps: [] }, graveyard: [], isOnline: true, tribe: 'Cat' },
      player2: { hp: 20, energy: 0, maxEnergy: 3, deck: initialP2.deckList.length, deckList: initialP2.deckList, hand: initialP2.hand, field: { units: [], traps: [] }, graveyard: [], isOnline: p2Online, tribe: 'Dog' }
    };
    
    try { 
        await setDoc(doc(db, "games", newRoomId), initialGameState); 
        setRoomId(newRoomId); 
        setMyPlayerId('player1'); 
        setIsVsAI(vsAI);
    } 
    catch (error) { alert("Error: " + error.message); }
    setLoading(false);
  };

  const joinRoom = async () => {
    if (!inputRoomId) return alert("Please enter room code.");
    setLoading(true);
    const roomRef = doc(db, "games", inputRoomId.toUpperCase());
    try {
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
        const data = roomSnap.data();
        if (data.dice.status !== 'waiting' && data.player2.isOnline) { 
            alert('Room is full.'); 
            setLoading(false); return; 
        }
        setRoomId(inputRoomId.toUpperCase()); 
        setMyPlayerId('player2'); 
        setIsVsAI(false);
        await updateDoc(roomRef, { message: "Both players are in! Roll dice to decide who starts...", dice: { ...data.dice, status: 'ready' }, player2: { ...data.player2, isOnline: true } });
        } else alert("Room not found."); 
    } catch (error) { alert("Error joining room"); }
    setLoading(false);
  };
  
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = onSnapshot(doc(db, "games", roomId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        if (isVsAI && data.currentTurn === 'player2' && !data.winner) handleAITurn(data);
        if (!isVsAI && data.currentTurn !== null && data.winner === null) {
            const opponentId = myPlayerId === 'player1' ? 'player2' : 'player1';
            if (data[opponentId] && data[opponentId].isOnline === false && data.dice.status === 'done') {
                runTransaction(db, async (transaction) => {
                    const freshSnap = await transaction.get(doc(db, "games", roomId));
                    if (freshSnap.data().winner) return;
                    transaction.update(doc(db, "games", roomId), { winner: myPlayerId, message: "Opponent left the game. You win!" });
                }).catch(e => console.error(e));
            }
        }
        setGameState(data); setCardIdCounter(data.cardIdCounter || 100); 
      } else { 
        alert("This room has been closed."); 
        setRoomId(null); setGameState(null); 
      }
    });
    return () => unsubscribe(); 
  }, [roomId, myPlayerId, isVsAI]); 

  useEffect(() => {
    if (!gameState?.dice) {
      setCanEnterMatch(false);
      return;
    }
    if (gameState.dice.status === 'done') {
      const timer = setTimeout(() => setCanEnterMatch(true), 1500);
      return () => clearTimeout(timer);
    }
    setCanEnterMatch(false);
  }, [gameState?.dice?.status]);

  const handleDiceRoll = async () => {
    if (!gameState || !gameState.dice || gameState.winner || gameState.dice.status !== 'ready' || isRolling) return;
    const isOpponentReady = gameState.player2.isOnline;
    if (gameState.dice.status === 'ready' && !isOpponentReady) return alert("Wait for the other player before rolling dice.");
    if (gameState.dice[myPlayerId]) return alert("You already rolled.");
    
    setIsRolling(true); 
    setTimeout(async () => {
        const roll = Math.floor(Math.random() * 6) + 1;
        setDiceResult(roll); 
        
        let aiRoll = gameState.dice.player2;
        if (isVsAI) aiRoll = Math.floor(Math.random() * 6) + 1;

        const newDiceState = { ...gameState.dice, [myPlayerId]: roll, ...(isVsAI && { player2: aiRoll }) };
        let newState = { ...gameState, dice: newDiceState, message: `${myPlayerId === 'player1' ? 'P1' : 'P2'} rolled ${roll}` };
        
        if (newDiceState.player1 !== null && newDiceState.player2 !== null) {
            // Both players have rolled: show shared rolling animation first.
            newState.dice = { ...newDiceState, status: 'resolving' };
            newState.message = `Both players rolled. Revealing result...`;
            await saveGame(newState);
            await new Promise(resolve => setTimeout(resolve, 1200));

            const p1Roll = newDiceState.player1; 
            const p2Roll = newDiceState.player2;
            let startingPlayer = null; 
            let message = `P1: ${p1Roll}, P2: ${p2Roll}. `;
            
            if (p2Roll > p1Roll) startingPlayer = 'player2';
            else if (p1Roll > p2Roll) startingPlayer = 'player1';
            else {
                newState.dice = { player1: null, player2: null, status: 'ready' }; 
                newState.message = `${message} Tie! Roll again.`;
                await saveGame(newState); 
                setIsRolling(false); 
                return;
            }
            newState.currentTurn = startingPlayer; newState.turnNumber = 1; newState.startingPlayer = startingPlayer;
            newState.player1.energy = 3; newState.player1.maxEnergy = 3;
            newState.player2.energy = 3; newState.player2.maxEnergy = 3;
            newState.dice = { ...newDiceState, status: 'done' };
            newState.message = `${message} ${startingPlayer === 'player1' ? 'P1' : 'P2'} starts first!`;
        }
        await saveGame(newState); 
        setIsRolling(false);
    }, 1500); 
  };
  
  const drawCard = (player) => {
    if (gameState.winner || gameState.currentTurn === null || player !== myPlayerId) return;
    if (gameState.hasDrawnThisTurn || gameState[player].deck <= 0 || gameState[player].hand.length >= 6) return;
    
    const currentDeckList = gameState[player].deckList || [];
    if (currentDeckList.length === 0) return;

    const newCard = { ...currentDeckList[0], id: cardIdCounter, canAttack: false };
    const newDeckList = currentDeckList.slice(1);

    const newState = { ...gameState, cardIdCounter: cardIdCounter + 1, [player]: { ...gameState[player], hand: [...gameState[player].hand, newCard], deckList: newDeckList, deck: newDeckList.length }, hasDrawnThisTurn: true, message: `${player === 'player1' ? 'P1' : 'P2'} drew a card.` };
    saveGame(newState);
  };

  const playCard = (card, player) => {
    if (gameState.winner || gameState.currentTurn !== player || player !== myPlayerId) return; 
    if (gameState[player].energy < card.cost) return alert('Not enough energy.'); 
    const opponent = player === 'player1' ? 'player2' : 'player1';
    
    let newState = { ...gameState };
    let newPlayer = { ...newState[player] };
    newPlayer.graveyard = newPlayer.graveyard || [];
    let newOpponent = { ...newState[opponent] };
    newOpponent.graveyard = newOpponent.graveyard || [];
    
    if (card.type === 'spell' || card.type === 'trap') {
        if (newPlayer.field.traps.length >= 3) return alert('Trap/Spell zone is full (3 cards).'); 
        
        if (card.effect === 'field_buff') {
            // If a Field Spell already exists, send the old one to the owner's graveyard
            if (newState.fieldSpellCard) {
                newState[newState.fieldSpellCard.ownerId].graveyard = newState[newState.fieldSpellCard.ownerId].graveyard || [];
                newState[newState.fieldSpellCard.ownerId].graveyard.push(newState.fieldSpellCard);
            }
            newState.fieldEffect = { ...card.effectConfig, ownerId: player }; 
            newState.fieldSpellCard = { ...card, ownerId: player };
            newState.message = `${player === 'player1' ? 'P1' : 'P2'} activated Field: ${card.name}!`;
        } 
        else if (card.effect === 'summon_from_deck') {
            if (newPlayer.field.units.length >= 5) return alert('Unit zone is full (5 cards).'); 
            const targetTribe = card.effectConfig.targetTribe;
            const deckList = newPlayer.deckList || [];
            const foundIndex = deckList.findIndex(c => c.tribe === targetTribe && c.type === 'unit');
            
            if (foundIndex !== -1) {
                const summonedUnit = { ...deckList[foundIndex], id: cardIdCounter + 99, canAttack: newState.turnNumber >= 2 };
                newPlayer.field.units.push(summonedUnit);
                newPlayer.deckList.splice(foundIndex, 1);
                newPlayer.deck = newPlayer.deckList.length;
                newState.message = `${player === 'player1' ? 'P1' : 'P2'} summoned ${summonedUnit.name} from deck!`;
                newState.cardIdCounter += 1;
                newPlayer.graveyard.push(card); // Spell has been used and goes to graveyard
            } else {
                newState.message = `No ${targetTribe} unit found in deck.`;
                newPlayer.graveyard.push(card);
            }
        }
        else if (card.effect === 'heal_player') {
            newPlayer.hp = Math.min(20, newPlayer.hp + (card.effectValue || 0));
            newPlayer.graveyard.push(card);
        }
        else if (card.effect === 'damage_player') {
            if (isFirstRoundNoDamage(gameState)) return alert('First round rule: no damage can be dealt yet.');
            newOpponent.hp = Math.max(0, newOpponent.hp - (card.effectValue || 0));
            newPlayer.graveyard.push(card);
        }
        else {
            newPlayer.field.traps.push({ ...card, canAttack: false });
        }
    } else {
        if (newPlayer.field.units.length >= 5) return alert('Unit zone is full (5 cards).'); 
        const canAttackImmediately = canUnitAttack(card) ? gameState.turnNumber >= 2 : false;
        newPlayer.field.units.push({ ...card, canAttack: canAttackImmediately });
    }

    newPlayer.energy -= card.cost;
    newPlayer.hand = newPlayer.hand.filter(c => c.id !== card.id);

    newState[player] = newPlayer;
    newState[opponent] = newOpponent;
    saveGame(newState);
  };

  const selectAttacker = (card, player) => {
    if (gameState.winner || gameState.currentTurn !== player || player !== myPlayerId) return;
    if (isFirstRoundNoDamage(gameState)) return alert("First round rule: attacks are disabled.");
    if (card.type !== 'unit') return alert("This card cannot attack.");
    if (card.category === 'guard') return alert("Guard cards are defensive only and cannot attack.");
    if (!card.canAttack) return alert("This unit cannot attack yet.");
    // ATK 0 units are allowed to attack (tactics / trap triggers)
    setLocalAttackingCard(card); 
  };

  // --- Discard Card to Graveyard ---
  const handleDiscardCard = (card) => {
      let newState = { ...gameState };
      let pState = newState[myPlayerId];
      pState.hand = pState.hand.filter(c => c.id !== card.id);
      pState.graveyard = pState.graveyard || [];
      pState.graveyard.push(card);
      saveGame(newState);

      if (discardCount - 1 <= 0) {
          setDiscardCount(0);
          alert("Discard complete. You can end your turn now.");
      } else {
          setDiscardCount(discardCount - 1);
      }
  };

  // --- 1. Unit vs Unit Attack (trap + death resolution) ---
  const attackCard = (targetCard, targetPlayer) => {
    if (gameState.winner || !localAttackingCard) return; 
    if (isFirstRoundNoDamage(gameState)) return;
    if (targetCard.type !== 'unit' || targetPlayer === myPlayerId) return;

    const hasOtherDefender = gameState[targetPlayer].field.units.some(u => isCardDefender(u) && u.id !== targetCard.id);
    if (hasOtherDefender && !isCardDefender(targetCard)) return alert('You must attack Defender first.');

    const attacker = localAttackingCard;
    const attackerPlayer = gameState.currentTurn;

    setAttackingId(attacker.id);

    setTimeout(() => {
        const attackerStats = getBuffedStats(attacker, gameState.fieldEffect, attackerPlayer);
        const targetStats = getBuffedStats(targetCard, gameState.fieldEffect, targetPlayer);

        let damageToTarget = attackerStats.attack;
        let attackerNewHp = gameState[attackerPlayer].hp; 
        let battleMsg = `${attacker.name} (${damageToTarget}) attacked ${targetCard.name}!`;

        // Check trap response on target side
        let newTraps = gameState[targetPlayer].field.traps;
        const trapCard = newTraps.find(c => c.type === 'trap');
        let targetGraveyard = gameState[targetPlayer].graveyard || [];
        
        if (trapCard) {
            const trapEffect = getTrapDamage(trapCard); 
            attackerNewHp -= trapEffect; 
            battleMsg = `Trap ${trapCard.name} reflected ${trapEffect} damage!`;
            newTraps = newTraps.filter(t => t.id !== trapCard.id); 
            targetGraveyard.push(trapCard); // Triggered trap goes to graveyard
        }

        // Apply damage to base HP and evaluate death with effective HP
        let targetNewBaseHp = targetCard.hp - damageToTarget;
        // If effective HP <= 0, the target is destroyed
        let isDead = targetNewBaseHp + (targetStats.hp - targetCard.hp) <= 0;

        let newUnits = gameState[targetPlayer].field.units;
        if (isDead) {
            newUnits = newUnits.filter(c => c.id !== targetCard.id);
            targetGraveyard.push(targetCard); // Destroyed target goes to graveyard
        } else {
            newUnits = newUnits.map(c => c.id === targetCard.id ? { ...c, hp: targetNewBaseHp } : c);
        }

        const newState = {
            ...gameState,
            [attackerPlayer]: { 
                ...gameState[attackerPlayer], 
                hp: Math.max(0, attackerNewHp), 
                field: { ...gameState[attackerPlayer].field, units: gameState[attackerPlayer].field.units.map(c => c.id === attacker.id ? { ...c, canAttack: false } : c) } 
            },
            [targetPlayer]: { 
                ...gameState[targetPlayer], 
                graveyard: targetGraveyard,
                field: { traps: newTraps, units: newUnits }
            },
            message: battleMsg
        };

        saveGame(newState);
        setLocalAttackingCard(null);  
        setAttackingId(null);  
    }, 400);
  };

  // --- 2. Direct Attack on Player ---
  const attackPlayer = (targetPlayer) => {
      if (gameState.winner || !localAttackingCard) return;
      if (isFirstRoundNoDamage(gameState)) return;
      if (targetPlayer === myPlayerId) return;

      const attacker = localAttackingCard;
      const attackerPlayer = gameState.currentTurn;

      setAttackingId(attacker.id);

      setTimeout(() => {
          const attackerStats = getBuffedStats(attacker, gameState.fieldEffect, attackerPlayer);
          let targetNewHp = gameState[targetPlayer].hp - attackerStats.attack;
          let battleMsg = `${attacker.name} attacked the player directly for ${attackerStats.attack} damage!`;
          let attackerNewHp = gameState[attackerPlayer].hp;

          let newTraps = gameState[targetPlayer].field.traps;
          const trapCard = newTraps.find(c => c.type === 'trap');
          let targetGraveyard = gameState[targetPlayer].graveyard || [];
          
          if (trapCard) {
              const trapEffect = getTrapDamage(trapCard); 
              attackerNewHp -= trapEffect; 
              battleMsg = `Trap ${trapCard.name} reflected ${trapEffect} damage!`;
              newTraps = newTraps.filter(t => t.id !== trapCard.id);
              targetGraveyard.push(trapCard); // Triggered trap goes to graveyard
          }

          const newState = {
              ...gameState,
              [attackerPlayer]: { 
                  ...gameState[attackerPlayer], 
                  hp: Math.max(0, attackerNewHp),
                  field: { ...gameState[attackerPlayer].field, units: gameState[attackerPlayer].field.units.map(c => c.id === attacker.id ? { ...c, canAttack: false } : c) } 
              },
              [targetPlayer]: { 
                  ...gameState[targetPlayer], 
                  hp: Math.max(0, targetNewHp), 
                  graveyard: targetGraveyard,
                  field: { ...gameState[targetPlayer].field, traps: newTraps }
              },
              message: battleMsg
          };

          saveGame(newState);
          setLocalAttackingCard(null);
          setAttackingId(null);
      }, 400);
  };

  const endTurn = () => {
    if (gameState.winner || gameState.currentTurn !== myPlayerId) return;
    if (!gameState.hasDrawnThisTurn) {
        alert("You must draw a card before ending your turn.");
        return;
    }
    
    // Enforce discard rule when hand size exceeds the limit
    const myHandSize = gameState[myPlayerId].hand.length;
    if (myHandSize > 5) {
        setDiscardCount(myHandSize - 5);
        alert(`You have more than 5 cards. Discard ${myHandSize - 5} card(s) first.`);
        return;
    }

    const nextPlayer = gameState.currentTurn === 'player1' ? 'player2' : 'player1';
    let newTurnNumber = gameState.turnNumber;
    
    if (gameState.startingPlayer) {
        if (nextPlayer === gameState.startingPlayer) newTurnNumber += 1;
    } else {
        if (gameState.currentTurn === 'player2') newTurnNumber += 1;
    }
    
    const calculatedMaxEnergy = Math.min(10, 2 + newTurnNumber);
    const newState = { ...gameState, currentTurn: nextPlayer, turnNumber: newTurnNumber, hasDrawnThisTurn: false, 
        [nextPlayer]: { ...gameState[nextPlayer], maxEnergy: calculatedMaxEnergy, energy: calculatedMaxEnergy, 
            field: { units: gameState[nextPlayer].field.units.map(c => ({ ...c, canAttack: canUnitAttack(c) })), traps: gameState[nextPlayer].field.traps } },
        message: `Turn changed to ${nextPlayer === 'player1' ? 'P1' : 'P2'} (Round ${newTurnNumber})` };
    saveGame(newState);
  };

  const opponentHasUnits = (opponentId) => {
      return gameState[opponentId].field.units.length > 0;
  };

  const shouldShowDescription = (card) => {
    const category = (card?.category || '').toLowerCase();
    return category === 'trap' || category === 'spell' || category === 'guard';
  };

  // --- UI Components ---
  const CardBack = ({ type }) => {
    const sizeClasses = type === 'hand' ? "w-32 h-44" : "w-24 h-32";
    return <div className={`bg-slate-800 border-4 border-slate-600 rounded-lg shadow-2xl relative flex items-center justify-center ${sizeClasses} overflow-hidden`}><div className="absolute inset-0 bg-cover bg-center opacity-100" style={{backgroundImage: `url(${CARD_BACK_URL})`}}></div></div>;
  };
  
  const CardComponent = ({ card, onClick, isPlayable, isAttacking, isField, showAttackGlow, isDiscarding, onMouseEnter, onMouseLeave, ownerId }) => {
    const isTaunt = isCardDefender(card); 
    const sizeClasses = isField ? "w-24 h-36 text-[8px]" : "w-32 h-48 text-[10px]";
    const hoverClass = !isField && (isPlayable || isDiscarding) ? 'hover:-translate-y-6 hover:scale-110 z-20 transition-all duration-200 cursor-pointer' : '';
    const stats = isField ? getBuffedStats(card, gameState?.fieldEffect, ownerId) : { attack: card.attack, hp: card.hp, isBuffed: false };
    const borderColor = card.type === 'unit' ? 'border-slate-300' : card.type === 'spell' ? (card.effect === 'field_buff' ? 'border-yellow-400' : 'border-purple-300') : 'border-red-300';
    const bgColor = card.category === 'spell'
      ? 'bg-purple-900'
      : card.category === 'trap'
        ? 'bg-red-900'
        : 'bg-black';

    const isMoving = card.id === attackingId;
    const moveClass = isMoving ? (ownerId === 'player1' ? 'translate-y-[-150px] scale-110 z-50 transition-transform duration-300 ease-in-out' : 'translate-y-[150px] scale-110 z-50 transition-transform duration-300 ease-in-out') : '';
    const showDescription = shouldShowDescription(card);
    const descriptionLength = showDescription ? (card.description || '').length : 0;
    const hasStatFooter = card.type === 'unit' || card.attack > 0;
    const descriptionTextSize = isField
      ? (descriptionLength > 120 ? 'text-[7px]' : descriptionLength > 80 ? 'text-[8px]' : 'text-[9px]')
      : (descriptionLength > 180 ? 'text-[12px]' : descriptionLength > 130 ? 'text-[13px]' : 'text-[14px]');
    const descriptionHeight = hasStatFooter
      ? (isField ? 'h-[40px]' : 'h-[74px]')
      : (isField ? 'h-[46px]' : 'h-[98px]');
    const playableClass = !isField && isPlayable && !isDiscarding
      ? 'ring-2 ring-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.7)]'
      : '';
    const artBgClass = card.category === 'spell'
      ? 'bg-purple-800'
      : card.category === 'trap'
        ? 'bg-red-800'
        : 'bg-neutral-900';
    const isPlaceholderArt = typeof card.imageUrl === 'string' && card.imageUrl.includes('placehold.co');

    return (
      <div 
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`relative ${bgColor} border-[3px] ${borderColor} rounded-lg shadow-xl flex flex-col ${sizeClasses} ${hoverClass} ${!isPlayable && !isField && !isDiscarding ? 'opacity-70 grayscale' : 'opacity-100'} select-none overflow-hidden ${moveClass}
        ${isAttacking ? 'ring-4 ring-red-500 scale-105' : ''}
        ${showAttackGlow ? 'ring-4 ring-yellow-400 scale-105' : ''}
        ${isDiscarding ? 'ring-4 ring-red-600 animate-pulse' : ''}
        ${playableClass}`}
      >
        {isDiscarding && <div className="absolute inset-0 bg-red-900/40 z-50 flex items-center justify-center backdrop-blur-[1px]"><Trash size={32} className="text-white drop-shadow-md" /></div>}
        
        <div className="relative bg-slate-200 text-black font-bold px-1 py-0.5 flex items-center justify-between border-b-2 border-slate-400 h-6">
              <div className="absolute -left-1.5 -top-1.5 w-8 h-8 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white font-black text-sm shadow-sm z-10">
                 {card.cost}
              </div>
              <div className="ml-5 w-full text-center truncate leading-tight uppercase tracking-tighter">
                 {card.name}
              </div>
        </div>

        <div className={`relative w-full h-1/2 ${artBgClass} border-b-2 border-slate-500 overflow-hidden`}>
            <img src={card.imageUrl} alt={card.name} className={`w-full h-full object-cover ${isPlaceholderArt ? 'opacity-25 grayscale mix-blend-luminosity' : ''}`} />
            <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded-tl-md border-t border-l border-white/20">
                {card.tribe}
            </div>
            {isTaunt && <div className="absolute top-1 right-1 bg-white text-black text-[8px] font-bold px-1 rounded shadow-sm">DEF</div>}
            {isField && card.canAttack && <div className="absolute top-1 right-1 bg-red-600 text-white text-[8px] font-bold px-1 rounded shadow-sm animate-pulse">ATK</div>}
        </div>

        <div className="bg-slate-700 text-white text-[8px] text-center py-0.5 font-bold uppercase border-b border-slate-600">
            {card.effect === 'field_buff' ? 'FIELD' : card.category}
        </div>

        {showDescription && (
          <div className={`${descriptionHeight} shrink-0 bg-slate-100 p-1 flex items-center justify-center text-center overflow-hidden`}>
              <p className={`text-slate-900 font-serif leading-tight font-medium break-words ${descriptionTextSize} ${isField ? 'line-clamp-3' : 'line-clamp-4'}`}>
                 {card.description}
              </p>
          </div>
        )}

        {hasStatFooter && (
             <div className="h-6 shrink-0 mt-auto bg-slate-800 flex justify-between items-center px-1 border-t-2 border-slate-400">
                 <div className={`flex items-center justify-center w-6 h-6 rounded-full border border-white shadow-sm -ml-2 transform scale-90 ${stats.isBuffed ? 'bg-green-500 text-white' : 'bg-orange-600 text-white'}`}>
                    <span className="font-black text-xs">{stats.attack}</span>
                 </div>
                 {card.type === 'unit' && <Swords size={10} className="text-slate-500 opacity-50" />}
                 {card.type === 'unit' && (
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full border border-white shadow-sm -mr-2 transform scale-90 ${stats.isBuffed ? 'bg-green-500 text-white' : 'bg-emerald-600 text-white'}`}>
                        <span className="font-black text-xs">{stats.hp}</span>
                    </div>
                 )}
             </div>
        )}
      </div>
    );
  };

  const CardPreview = ({ card }) => {
    if (!card) return null;
    const isTaunt = isCardDefender(card);
    const showDescription = shouldShowDescription(card);
    const hasStatFooter = card.type === 'unit' || card.attack > 0;
    const borderColor = card.type === 'unit' ? 'border-slate-300' : card.type === 'spell' ? 'border-purple-300' : 'border-red-300';
    const previewBg = card.category === 'spell'
      ? 'bg-purple-900'
      : card.category === 'trap'
        ? 'bg-red-900'
        : 'bg-black';

    return (
      <div className="fixed top-1/2 left-8 -translate-y-1/2 z-50 hidden lg:block animate-in slide-in-from-left-10 duration-300 pointer-events-none">
          <div className={`relative ${previewBg} border-4 ${borderColor} rounded-xl shadow-2xl w-[300px] h-[440px] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden`}>
               <div className="relative bg-slate-200 text-black font-bold px-2 py-2 flex items-center justify-between border-b-4 border-slate-400 h-12">
                    <div className="absolute -left-2 -top-2 w-12 h-12 bg-blue-600 rounded-full border-4 border-white flex items-center justify-center text-white font-black text-xl shadow-md z-10">
                        {card.cost}
                    </div>
                    <div className="ml-10 w-full text-center text-lg font-black uppercase tracking-tight">{card.name}</div>
               </div>
               <div className={`w-full h-[190px] ${card.category === 'spell' ? 'bg-purple-800' : card.category === 'trap' ? 'bg-red-800' : 'bg-neutral-900'} border-b-4 border-slate-600 relative`}>
                   <img src={card.imageUrl} className={`w-full h-full object-cover ${typeof card.imageUrl === 'string' && card.imageUrl.includes('placehold.co') ? 'opacity-25 grayscale mix-blend-luminosity' : ''}`} />
                   {isTaunt && <div className="absolute top-2 right-2 bg-white text-black font-bold px-2 py-1 rounded shadow">DEFENDER</div>}
               </div>
               <div className="bg-slate-800 text-white text-xs text-center py-1 font-bold uppercase border-b border-slate-600 tracking-widest">
                    {card.type} • {card.tribe}
               </div>
               {showDescription && (
                 <div className={`${hasStatFooter ? 'h-[120px] border-b-4' : 'h-[168px]'} shrink-0 bg-slate-100 p-4 flex items-center justify-center text-center border-slate-400 overflow-hidden`}>
                      <p className={`text-slate-900 font-serif ${(card.description || '').length > 180 ? 'text-sm' : 'text-base'} font-medium leading-snug break-words line-clamp-5`}>
                          {card.description}
                      </p>
                 </div>
               )}
               {hasStatFooter && (
                   <div className="h-12 shrink-0 mt-auto bg-slate-800 flex justify-between items-center px-4">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-orange-600 border-2 border-white flex items-center justify-center text-white font-black text-lg shadow">
                                {card.attack}
                            </div>
                            <Swords size={18} className="text-orange-400" />
                        </div>
                        {card.type === 'unit' && (
                            <div className="flex items-center gap-2">
                                <Shield size={18} className="text-emerald-400" />
                                <div className="w-9 h-9 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center text-white font-black text-lg shadow">
                                    {card.hp}
                                </div>
                            </div>
                        )}
                   </div>
               )}
          </div>
      </div>
    );
  };

  const StatusBadge = ({ player, data, isMe, isCurrentTurn, canAttackPlayer }) => (
    <div onClick={() => canAttackPlayer && attackPlayer(player)} 
        className={`flex items-center gap-2 transition-all duration-300 w-full justify-start p-1 rounded-lg
                    ${canAttackPlayer ? 'cursor-pointer ring-2 ring-red-500 bg-red-900/20 animate-pulse' : ''}`}>
        <div className={`text-center transition-transform w-20`}>
            <div className={`text-sm font-black tracking-tight ${isCurrentTurn ? 'text-green-400' : 'text-slate-400'}`}>
                {player === 'player1' ? 'P1' : 'P2'} {isMe && '(YOU)'}
            </div>
        </div>
        <div className="flex-1 flex gap-2">
            <div className="bg-red-900/60 rounded px-2 py-1 flex items-center gap-1 border border-red-500/30 min-w-[60px] justify-center">
                <Heart size={14} className="text-red-500" /> <span className="font-bold text-white">{data.hp}</span>
            </div>
            <div className="bg-blue-900/60 rounded px-2 py-1 flex items-center gap-1 border border-blue-500/30 min-w-[60px] justify-center">
                <Zap size={14} className="text-yellow-400" /> <span className="font-bold text-white">{data.energy}/{data.maxEnergy}</span>
            </div>
        </div>
    </div>
  );

  // --- Deck and Graveyard panel near the field ---
  const DeckAndGraveDisplay = ({ player }) => {
      const data = gameState[player];
      const isMe = player === myPlayerId;
      const isCurrentTurn = gameState.currentTurn === player;
      const canDraw = isCurrentTurn && !gameState.hasDrawnThisTurn && data.deck > 0 && data.hand.length < 6 && discardCount === 0;
      
      return (
          <div className="flex flex-col gap-2 items-center justify-center">
              {/* DECK */}
              {!isMe ? (
                  <div className="w-16 h-12 bg-slate-800 border border-slate-600 rounded flex flex-col items-center justify-center text-slate-500 text-[10px]"><span>DECK</span><span className="font-bold text-sm">{data.deck}</span></div>
              ) : (
                  <button onClick={() => drawCard(player)} disabled={!canDraw} 
                      className={`w-16 h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all relative
                      ${canDraw ? 'bg-indigo-900 border-indigo-400 hover:scale-105 text-white' : 'bg-slate-800 border-slate-600 text-slate-500 opacity-70'}`}>
                      <span className="text-[10px] font-bold">DECK</span>
                      <span className="text-xl font-bold">{data.deck}</span>
                      {isCurrentTurn && canDraw && <div className="absolute -top-2 -right-2 bg-green-500 w-4 h-4 rounded-full animate-ping"></div>}
                  </button>
              )}
              {/* GRAVEYARD */}
              <div 
                  className="w-16 h-16 rounded-lg border-2 border-slate-700 bg-slate-900 flex flex-col items-center justify-center text-slate-400 shadow-inner relative group cursor-help"
                  onMouseEnter={() => { if(data.graveyard && data.graveyard.length > 0) setShowCardDetail(data.graveyard[data.graveyard.length-1]) }}
                  onMouseLeave={() => setShowCardDetail(null)}
              >
                  <Skull size={14} className="mb-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <span className="text-[9px] font-bold">GRAVE</span>
                  <span className="text-sm font-bold">{data.graveyard ? data.graveyard.length : 0}</span>
              </div>
          </div>
      );
  };

  const FieldDisplay = ({ player, data, isMe, isCurrentTurn }) => {
    const unitAreaOrder = isMe ? 'order-1' : 'order-2';
    const trapAreaOrder = isMe ? 'order-2' : 'order-1';
    return (
        <div className="flex justify-center gap-4 w-full h-full items-center">
            <div className={`border-2 border-dashed border-slate-700/50 rounded-xl p-1 min-h-[140px] w-full flex items-center justify-center gap-2 ${unitAreaOrder}`}>
                {data.units.length === 0 && <span className="text-slate-700 text-xs font-bold">UNIT ZONE</span>}
                {data.units.map(c => <CardComponent key={c.id} card={c} isField={true} ownerId={player} onClick={() => { if (isCurrentTurn && c.canAttack) selectAttacker(c, player); else if (localAttackingCard && !isMe) attackCard(c, player); }} isPlayable={false} isAttacking={localAttackingCard?.id === c.id} showAttackGlow={localAttackingCard && !isMe} onMouseEnter={() => setShowCardDetail(c)} onMouseLeave={() => setShowCardDetail(null)} />)}
            </div>
            <div className={`border-2 border-dashed border-slate-700/50 rounded-xl p-1 min-h-[140px] w-[40%] flex items-center justify-center gap-2 ${trapAreaOrder}`}>
                {data.traps.length === 0 && <span className="text-slate-700 text-xs font-bold">TRAP</span>}
                {data.traps.map(c => !isMe ? <CardBack key={c.id} type="field" /> : <CardComponent key={c.id} card={c} isField={true} isPlayable={false} onMouseEnter={() => setShowCardDetail(c)} onMouseLeave={() => setShowCardDetail(null)} />)}
            </div>
        </div>
    );
  };

  const HandArea = ({ data, isMe, isCurrentTurn }) => {
    const sortedHand = useMemo(() => [...data.hand].sort((a, b) => (a.type === 'unit' && b.type !== 'unit' ? -1 : 1)), [data.hand]);
    if (isMe) {
        return (
            <div className={`flex justify-center gap-2 flex-wrap min-h-[180px] items-center px-4 p-2 rounded-xl transition-all ${discardCount > 0 ? 'bg-red-900/20 border-2 border-red-500/50 animate-pulse' : ''}`}>
                {sortedHand.map(card => (
                    <CardComponent 
                        key={card.id} 
                        card={card} 
                        onClick={() => {
                            if (discardCount > 0) handleDiscardCard(card);
                            else playCard(card, myPlayerId);
                        }} 
                        isPlayable={isCurrentTurn && data.energy >= card.cost && discardCount === 0} 
                        isDiscarding={discardCount > 0}
                        onMouseEnter={() => setShowCardDetail(card)} 
                        onMouseLeave={() => setShowCardDetail(null)} 
                    />
                ))}
            </div>
        );
    }
    return <div className="flex justify-center gap-1 min-h-[120px] items-center px-4">{data.hand.map((_, i) => <CardBack key={i} type="hand" />)}</div>;
  };

  const PlayerArea = ({ player }) => {
    const data = gameState[player];
    const isMe = player === myPlayerId;
    const isCurrentTurn = gameState.currentTurn === player;
    
    const canAttackPlayer = localAttackingCard && gameState.currentTurn === myPlayerId && !opponentHasUnits(player); 
    const isOpponent = !isMe;

    return (
      <div className={`flex ${isOpponent ? 'flex-col-reverse' : 'flex-col'} gap-1 w-full max-w-6xl mx-auto`}>
          <div className="flex justify-between items-center w-full px-2 h-[160px]">
              <div className="w-24 flex justify-center"><DeckAndGraveDisplay player={player} /></div>
              <div className="flex-1 px-2 h-full"><FieldDisplay player={player} data={data.field} isMe={isMe} isCurrentTurn={isCurrentTurn} /></div>
              <div className="w-48"><StatusBadge player={player} data={data} isMe={isMe} isCurrentTurn={isCurrentTurn} canAttackPlayer={isOpponent ? canAttackPlayer : false} /></div>
          </div>
          <div className="w-full"><HandArea data={data} isMe={isMe} isCurrentTurn={isCurrentTurn} /></div>
      </div>
    );
  };
  
  const isGameStarted = gameState && gameState.dice && gameState.dice.status === 'done' && canEnterMatch;
  const lobbyStatusMessage = useMemo(() => {
    if (!gameState || !gameState.dice) return 'Preparing room...';
    const d = gameState.dice;
    if (d.status === 'waiting') return 'Waiting for Player 2 to join...';
    if (d.status === 'ready') {
      if (d.player1 !== null && d.player2 === null) return 'Player 1 rolled. Waiting for Player 2...';
      if (d.player2 !== null && d.player1 === null) return 'Player 2 rolled. Waiting for Player 1...';
      if (d.player1 === null && d.player2 === null) return 'Both players ready. Roll the dice to decide who starts.';
      return 'Resolving dice result...';
    }
    if (d.status === 'resolving') return 'Both players rolled. Revealing result...';
    return 'Starting match...';
  }, [gameState]);

  if (!roomId || !gameState || !isGameStarted) {
    return (
      <div className="w-full h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-slate-950 to-black animate-pulse"></div>
        <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl text-center relative z-10">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-500 mb-2 filter drop-shadow-lg">CARD BATTLE</h1>
            <p className="text-slate-400 mb-8 text-sm uppercase tracking-widest">Turn-Based Strategy Game</p>

            {!roomId ? (
                <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                    <button onClick={() => createRoom(false)} disabled={loading} className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl font-bold hover:from-emerald-500 hover:to-teal-500 flex justify-center items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95">
                        {loading ? <Loader2 className="animate-spin" /> : <><Plus size={20}/> Create PvP Room</>}
                    </button>
                    <button onClick={() => createRoom(true)} disabled={loading} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold hover:from-blue-500 hover:to-indigo-500 flex justify-center items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95">
                        {loading ? <Loader2 className="animate-spin" /> : <><Zap size={20}/> Play vs AI</>}
                    </button>
                    <div className="relative pt-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500">or join</span></div>
                    </div>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Enter 6-digit room code" className="flex-1 bg-slate-800 rounded-xl px-4 text-center border border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase placeholder:normal-case" value={inputRoomId} onChange={e=>setInputRoomId(e.target.value)} maxLength={6} />
                        <button onClick={joinRoom} disabled={loading} className="bg-slate-700 px-6 rounded-xl font-bold hover:bg-slate-600 border border-slate-600 hover:border-slate-500 transition-all">Join</button>
                    </div>
                </div>
            ) : (
                !gameState ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4">
                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                        <p className="text-slate-400 animate-pulse">Connecting to Room...</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-bottom-10 duration-500">
                        <div className="flex flex-col items-center gap-2">
                             <span className="text-slate-400 text-xs uppercase tracking-wider">Room ID</span>
                             <div onClick={() => {navigator.clipboard.writeText(roomId); setCopied(true); setTimeout(()=>setCopied(false), 2000);}} 
                                  className="text-4xl font-mono font-black text-yellow-400 tracking-widest cursor-pointer hover:text-yellow-300 transition-colors flex items-center gap-2" title="Click to Copy">
                                {roomId} <Copy size={20} className={`text-slate-500 ${copied ? 'text-green-500' : ''}`} />
                             </div>
                             {copied && <span className="text-green-500 text-xs font-bold animate-bounce">Copied!</span>}
                        </div>

                        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                            <div className="text-blue-300 font-medium animate-pulse mb-6 min-h-[24px]">{lobbyStatusMessage}</div>
                            
                            <div className="flex justify-center gap-8 mb-8 items-end">
                                 <div className="flex flex-col items-center gap-2 transition-all duration-300">
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black shadow-xl border-4 
                                        ${gameState.dice?.player1 ? 'bg-white text-slate-900 border-blue-500' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>
                                        {(gameState.dice?.status === 'resolving' || (isRolling && myPlayerId === 'player1'))
                                          ? <Loader2 className="animate-spin text-blue-500" />
                                          : (gameState.dice?.player1 || '?')}
                                    </div>
                                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${myPlayerId === 'player1' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Player 1</span>
                                 </div>
                                 <div className="text-slate-600 font-black text-2xl pb-6">VS</div>
                                 <div className="flex flex-col items-center gap-2 transition-all duration-300">
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black shadow-xl border-4
                                        ${gameState.dice?.player2 ? 'bg-white text-slate-900 border-red-500' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>
                                        {(gameState.dice?.status === 'resolving' || (isRolling && myPlayerId === 'player2'))
                                          ? <Loader2 className="animate-spin text-red-500" />
                                          : (gameState.dice?.player2 || '?')}
                                    </div>
                                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${myPlayerId === 'player2' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Player 2</span>
                                 </div>
                            </div>

                            {gameState.dice?.status === 'ready' ? (
                                <button 
                                    onClick={handleDiceRoll} 
                                    disabled={isRolling || !!gameState.dice[myPlayerId]} 
                                    className={`w-full py-4 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-lg transition-all transform
                                    ${!!gameState.dice[myPlayerId] 
                                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50' 
                                        : 'bg-gradient-to-r from-orange-500 to-red-500 hover:scale-105 hover:shadow-orange-500/20 active:scale-95'}`}
                                >
                                    {isRolling ? <Loader2 className="animate-spin" /> : <><Dice6 size={28} /> ROLL DICE</>}
                                </button>
                            ) : gameState.dice?.status === 'resolving' ? (
                                <div className="w-full py-4 rounded-2xl font-black text-xl flex items-center justify-center gap-3 bg-slate-700 text-slate-100 border border-slate-500">
                                    <Loader2 className="animate-spin" /> Rolling both dice...
                                </div>
                            ) : gameState.dice?.status === 'done' ? (
                                <div className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 bg-emerald-700/80 text-white border border-emerald-400">
                                    Result locked. Starting match...
                                </div>
                            ) : (
                                <div className="text-slate-500 italic text-sm">Waiting for players...</div>
                            )}
                        </div>
                        
                        <div className="flex justify-center">
                            <button onClick={closeRoom} className="text-red-500 hover:text-red-400 flex items-center gap-2 text-sm border border-red-900/50 px-4 py-2 rounded-lg bg-red-950/30 hover:bg-red-900/50 transition-colors">
                                <Trash2 size={16} /> Close Room / Cancel
                            </button>
                        </div>
                    </div>
                )
            )}
        </div>
      </div>
    );
  }
  
  if (gameState.winner) {
      return (
          <div className="w-full h-screen bg-slate-950 flex items-center justify-center text-white z-50 absolute">
              <div className={`text-center p-12 rounded-3xl shadow-2xl border-4 ${gameState.winner === myPlayerId ? 'bg-green-900 border-green-500' : 'bg-red-900 border-red-500'}`}>
                  <h1 className="text-6xl font-black mb-4">{gameState.winner === myPlayerId ? 'VICTORY!' : 'DEFEAT'}</h1>
                  <p className="text-xl mb-8">{gameState.message}</p>
                  <div className="flex gap-4 justify-center">
                      <button onClick={returnToModeSelect} className="bg-white text-black px-8 py-3 rounded-full font-bold text-lg hover:scale-105 transition-transform">Play Again</button>
                      <button onClick={closeRoom} className="bg-red-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-red-500 transition-colors flex items-center gap-2"><Trash2 size={20} /> Close Room</button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="w-full h-screen bg-slate-950 text-white overflow-hidden relative flex flex-col">
        
        {/* Background visual effect when a Field card is active */}
        <div className={`absolute inset-0 opacity-20 pointer-events-none transition-all duration-1000 ${gameState.fieldEffect ? (gameState.fieldEffect.targetTribe === 'Cat' ? 'bg-yellow-600' : 'bg-orange-900') : 'bg-slate-900'}`}></div>
        
        {/* Show active Field Spell in the center as ambient visual */}
        {gameState.fieldSpellCard && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-50 pointer-events-none flex flex-col items-center justify-center">
                 <img src={gameState.fieldSpellCard.imageUrl} className="w-40 h-auto rounded-lg shadow-2xl mix-blend-screen opacity-60" />
                 <span className="text-[40px] font-black text-white/40 uppercase tracking-widest mt-2">{gameState.fieldSpellCard.name}</span>
             </div>
        )}

        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40">
             <button
               onClick={endTurn}
               disabled={gameState.currentTurn !== myPlayerId || discardCount > 0 || !gameState.hasDrawnThisTurn}
               className={`w-32 h-16 rounded-2xl font-black text-lg border-4 shadow-xl flex items-center justify-center transition-all ${
                 gameState.currentTurn === myPlayerId && discardCount === 0 && gameState.hasDrawnThisTurn
                   ? 'bg-orange-500 border-orange-300 hover:scale-105 cursor-pointer animate-pulse'
                   : 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed'
               }`}
             >
                 {discardCount > 0 ? `Discard ${discardCount}` : <>END<br/>TURN</>}
             </button>
        </div>
        
        <button onClick={closeRoom} className="fixed top-4 left-4 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg shadow-xl border-2 border-red-400 transition-all z-50 font-bold text-xs flex items-center gap-2">
                                <Trash2 size={16} /> Close Room / Cancel
        </button>

        <CardPreview card={showCardDetail} />
        <div className="fixed top-4 right-4 z-40 pointer-events-none">
            <div className="bg-slate-900/90 px-5 py-2 rounded-2xl border border-slate-500 backdrop-blur shadow-xl text-right">
                <div className={`text-base font-black ${gameState.currentTurn === myPlayerId ? 'text-green-300' : 'text-amber-200'}`}>
                    {gameState.currentTurn === myPlayerId ? 'Your Turn' : 'Opponent Turn'}
                </div>
                <div className="text-xs font-bold text-slate-300">Round {gameState.turnNumber || 0}</div>
            </div>
        </div>
        
        <div className="flex-grow flex flex-col justify-between py-2 max-w-full mx-auto w-full relative z-10">
            <PlayerArea player={myPlayerId === 'player1' ? 'player2' : 'player1'} />
            <PlayerArea player={myPlayerId} />
        </div>
<button onClick={() => setShowRules(!showRules)} className="fixed bottom-6 right-6 bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-full shadow-xl border-2 border-slate-500 transition-all z-40"><HelpCircle size={24} /></button>
        {showRules && (
          <div className="fixed bottom-20 right-6 bg-slate-800/95 backdrop-blur-md text-slate-200 p-5 rounded-2xl shadow-2xl border border-slate-600 max-w-xs z-40">
             <h3 className="font-bold text-lg text-white mb-3">Rules</h3>
             <ul className="text-xs space-y-2 text-slate-300">
                 <li>- The starting player cannot attack the opposing player directly on the first opportunity.</li>
                 <li>- Defender units can still attack (even with 0 ATK) to trigger traps or tactical plays.</li>
                 <li>- If a unit attacks a unit, player HP is not reduced by that battle.</li>
                 <li>- Maximum hand size is 5. If over 5, discard down at end of turn.</li>
                 <li>- Used or destroyed cards go to the Graveyard.</li>
             </ul>
          </div>
        )}
    </div>
  );
};

export default CardGamePrototype;
