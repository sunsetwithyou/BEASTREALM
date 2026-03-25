import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Shield, Zap, Heart, Swords, Plus, Ban, X, HelpCircle, Clock, AlertTriangle, Copy, RotateCcw, Dice6, HandCoins, Minus, Loader2, MinusSquare, Skull, Trash2, Map } from 'lucide-react'; 

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

// เริ่มต้น Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CARD_BACK_URL = "https://i.postimg.cc/05Y7vZYW/BG.jpg";

const generateCardImage = (name, type) => {
    return `https://placehold.co/400x300/2e1065/FFFFFF.png?text=${name.replace(/\s/g, '+')}&font=roboto`;
};

// *** Helper: Check if card is Defender ***
const isCardDefender = (card) => {
    if (!card) return false;
    // เป็น Defender ถ้ามี keyword ใน description หรือ attack เป็น 0
    return (card.description && card.description.includes('DEFENDER')) || card.attack === 0;
};

const CardGamePrototype = () => {
  // --- Card Templates ---
  const cardTemplates = [
    // --- CAT TRIBE ---
    { name: 'Fluffy Purr', cost: 2, attack: 1, hp: 2, type: 'unit', color: 'green', tribe: 'Cat', description: 'Unit พื้นฐาน' },
    { name: 'Cat Commander', cost: 5, attack: 4, hp: 4, type: 'unit', color: 'green', tribe: 'Cat', description: 'ค่าสถานะสมดุล' },
    { name: 'Ninja Cat', cost: 3, attack: 4, hp: 2, type: 'unit', color: 'green', tribe: 'Cat', description: 'โจมตีแรงแต่ตัวบาง' },
    { name: 'Lazy Garfield', cost: 3, attack: 0, hp: 6, type: 'unit', color: 'green', tribe: 'Cat', description: 'DEFENDER: ขี้เกียจแต่ทนทาน' },
    { name: 'Royal Guard Cat', cost: 4, attack: 3, hp: 5, type: 'unit', color: 'green', tribe: 'Cat', description: 'องครักษ์แมวเหมียว' },
    { name: 'Mystic Meow', cost: 3, attack: 3, hp: 3, type: 'unit', color: 'green', tribe: 'Cat', description: 'แมวเวทมนตร์' },
    { name: 'Tiger Warrior', cost: 6, attack: 6, hp: 5, type: 'unit', color: 'green', tribe: 'Cat', description: 'นักรบเผ่าเสือ' },
    
    // Spells & Traps (Cat)
    { name: 'Fury Purr', cost: 3, attack: 3, hp: 0, type: 'spell', color: 'purple', tribe: 'Cat', description: 'โจมตีผู้เล่น 3 ดาเมจ', effect: 'damage_player', effectValue: 3 },
    { name: 'Scratch!', cost: 1, attack: 2, hp: 0, type: 'spell', color: 'purple', tribe: 'Cat', description: 'ข่วนหน้า 2 ดาเมจ', effect: 'damage_player', effectValue: 2 },
    { name: 'Meowgic Draw', cost: 2, attack: 2, hp: 0, type: 'spell', color: 'purple', tribe: 'Cat', description: 'โจมตีผู้เล่น 2 ดาเมจ', effect: 'damage_player', effectValue: 2 },
    { name: 'Thunder Meow', cost: 4, attack: 4, hp: 0, type: 'spell', color: 'purple', tribe: 'Cat', description: 'โจมตีผู้เล่น 4 ดาเมจ', effect: 'damage_player', effectValue: 4 },
    { name: 'Healing Purr', cost: 2, attack: 0, hp: 5, type: 'spell', color: 'purple', tribe: 'Cat', description: 'ฮีลผู้เล่น 5 HP', effect: 'heal_player', effectValue: 5 },
    { name: 'Cat Nap', cost: 3, attack: 0, hp: 8, type: 'spell', color: 'purple', tribe: 'Cat', description: 'นอนพักผ่อน ฮีล 8 HP', effect: 'heal_player', effectValue: 8 },
    { name: 'Cat Kingdom', cost: 4, attack: 0, hp: 0, type: 'spell', color: 'gold', tribe: 'Cat', description: 'FIELD: แมวเราทุกตัว +1/+1', effect: 'field_buff', effectConfig: { targetTribe: 'Cat', buffAtk: 1, buffHp: 1 } },
    { name: 'Meow Call', cost: 4, attack: 0, hp: 0, type: 'spell', color: 'purple', tribe: 'Cat', description: 'อัญเชิญแมวจากกอง 1 ตัว', effect: 'summon_from_deck', effectConfig: { targetTribe: 'Cat' } },
    { name: 'Surprise Purr', cost: 3, attack: 2, hp: 0, type: 'trap', color: 'red', tribe: 'Cat', description: 'กับดัก: สวนกลับ 2 ดาเมจ' },
    { name: 'Catnip Bomb', cost: 5, attack: 5, hp: 0, type: 'trap', color: 'red', tribe: 'Cat', description: 'กับดัก: สวนกลับ 5 ดาเมจ' },

    // --- DOG TRIBE ---
    { name: 'Dog Knight', cost: 5, attack: 5, hp: 3, type: 'unit', color: 'green', tribe: 'Dog', description: 'เน้นโจมตี' },
    { name: 'Bulldog Tank', cost: 3, attack: 2, hp: 6, type: 'unit', color: 'green', tribe: 'Dog', description: 'DEFENDER: ถึกทน' },
    { name: 'Speedy Chihuahua', cost: 2, attack: 3, hp: 1, type: 'unit', color: 'green', tribe: 'Dog', description: 'ตัวเล็กแต่กัดเจ็บ' },
    { name: 'General Doggo', cost: 6, attack: 6, hp: 6, type: 'unit', color: 'green', tribe: 'Dog', description: 'นายพลหมาผู้ยิ่งใหญ่' },
    { name: 'Samurai Shiba', cost: 4, attack: 5, hp: 4, type: 'unit', color: 'green', tribe: 'Dog', description: 'นักรบชิบะ' },
    { name: 'Wolf Hunter', cost: 4, attack: 4, hp: 4, type: 'unit', color: 'green', tribe: 'Dog', description: 'นักล่าหมาป่า' },

    // Spells & Traps (Dog)
    { name: 'Woof Woof', cost: 3, attack: 3, hp: 0, type: 'spell', color: 'purple', tribe: 'Dog', description: 'โจมตีผู้เล่น 3 ดาเมจ', effect: 'damage_player', effectValue: 3 },
    { name: 'Bite!', cost: 1, attack: 2, hp: 0, type: 'spell', color: 'purple', tribe: 'Dog', description: 'กัด 2 ดาเมจ', effect: 'damage_player', effectValue: 2 },
    { name: 'Nyagyagya', cost: 4, attack: 4, hp: 0, type: 'spell', color: 'purple', tribe: 'Dog', description: 'โจมตีผู้เล่น 4 ดาเมจ', effect: 'damage_player', effectValue: 4 },
    { name: 'Good Boy Treat', cost: 3, attack: 0, hp: 7, type: 'spell', color: 'purple', tribe: 'Dog', description: 'ขนมรางวัล ฮีล 7 HP', effect: 'heal_player', effectValue: 7 },
    { name: 'Dog Territory', cost: 4, attack: 0, hp: 0, type: 'spell', color: 'gold', tribe: 'Dog', description: 'FIELD: หมาเราทุกตัว +1/+1', effect: 'field_buff', effectConfig: { targetTribe: 'Dog', buffAtk: 1, buffHp: 1 } },
    { name: 'Pack Call', cost: 4, attack: 0, hp: 0, type: 'spell', color: 'purple', tribe: 'Dog', description: 'อัญเชิญหมาจากกอง 1 ตัว', effect: 'summon_from_deck', effectConfig: { targetTribe: 'Dog' } },
    { name: 'Paw of Cuteness', cost: 4, attack: 3, hp: 0, type: 'trap', color: 'red', tribe: 'Dog', description: 'กับดัก: สวนกลับ 3 ดาเมจ' },
    { name: 'Glare Glare', cost: 4, attack: 4, hp: 0, type: 'trap', color: 'red', tribe: 'Dog', description: 'กับดัก: สวนกลับ 4 ดาเมจ' },
    { name: 'Net Trap', cost: 3, attack: 3, hp: 0, type: 'trap', color: 'red', tribe: 'Dog', description: 'กับดัก: สวนกลับ 3 ดาเมจ' },

    // NEUTRAL
    { name: 'Khemmakhorn', cost: 2, attack: 1, hp: 1, type: 'unit', color: 'green', tribe: 'Neutral', description: 'Unit พื้นฐาน' },
    { name: 'Giant Derp', cost: 4, attack: 2, hp: 3, type: 'unit', color: 'green', tribe: 'Neutral', description: 'Unit พื้นฐาน' },
    { name: 'Panda Guardian', cost: 4, attack: 3, hp: 5, type: 'unit', color: 'green', tribe: 'Neutral', description: 'เน้นป้องกัน' },
    { name: 'Lazy Sloth', cost: 2, attack: 0, hp: 5, type: 'unit', color: 'green', tribe: 'Neutral', description: 'DEFENDER (ต้องตีตัวนี้ก่อน)' },
    { name: 'Meteor Fur', cost: 6, attack: 6, hp: 0, type: 'spell', color: 'purple', tribe: 'Neutral', description: 'โจมตี 6 ดาเมจ', effect: 'damage_player', effectValue: 6 },
  ].map(c => ({ ...c, imageUrl: generateCardImage(c.name, c.type) }));

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
  
  // *** NEW STATE FOR ANIMATION ***
  const [attackingId, setAttackingId] = useState(null); // เก็บ ID การ์ดที่กำลังพุ่งชน
  const isAIProcessing = useRef(false); // *** FIX: AI Lock ***

  // --- Helpers & Logic ---
  const generateRandomHand = (count, startId, requiredTribe) => {
    const hand = [];
    const availableTemplates = cardTemplates.filter(card => card.tribe === requiredTribe || card.tribe === 'Neutral');
    const shuffledTemplates = [...availableTemplates].sort(() => 0.5 - Math.random());
    for (let i = 0; i < count; i++) {
      const template = shuffledTemplates[i % shuffledTemplates.length];
      hand.push({ ...template, id: startId + i, canAttack: false });
    }
    return hand;
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

  const saveGame = async (newGameState) => {
    if (!roomId) return;
    if (!newGameState.winner) {
        let winner = null;
        if (newGameState.player1.hp <= 0) winner = 'player2';
        else if (newGameState.player2.hp <= 0) winner = 'player1';
        if (winner) {
            newGameState.message = `Game Over! ${winner === myPlayerId ? 'คุณชนะ!' : 'คุณแพ้!'} (${winner === 'player1' ? 'P1' : 'P2'} Wins)`;
            newGameState.winner = winner;
        }
    }
    try { await updateDoc(doc(db, "games", roomId), newGameState); } catch (error) { console.error(error); }
  };
  
  const closeRoom = async () => {
    if (!roomId) return;
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าจะปิดห้องนี้? ข้อมูลเกมจะถูกลบถาวร")) return;
    setLoading(true);
    try {
        await deleteDoc(doc(db, "games", roomId));
        setRoomId(null);
        setGameState(null);
        setMyPlayerId(null);
    } catch (error) {
        console.error("Error closing room:", error);
        alert("เกิดข้อผิดพลาดในการปิดห้อง");
    }
    setLoading(false);
  };

  // *** AI Logic ***
  const handleAITurn = async (currentState) => {
      if (isAIProcessing.current) return;
      if (currentState.winner || currentState.currentTurn !== 'player2') return;
      
      isAIProcessing.current = true;

      try {
        let newState = JSON.parse(JSON.stringify(currentState));

        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 👇 เพิ่มลอจิกการจั่วการ์ดของ AI ตรงนี้ 
        if (!newState.hasDrawnThisTurn && newState.player2.deck > 0 && newState.player2.hand.length < 6) {
            const currentDeckList = newState.player2.deckList || [];
            if (currentDeckList.length > 0) {
                const newCard = { ...currentDeckList[0], id: newState.cardIdCounter, canAttack: false };
                newState.player2.hand.push(newCard);
                newState.player2.deckList = currentDeckList.slice(1);
                newState.player2.deck = newState.player2.deckList.length;
                newState.cardIdCounter += 1;
                newState.hasDrawnThisTurn = true;
                newState.message = "AI จั่วการ์ด!";
                
                // บันทึกสถานะว่าจั่วไพ่แล้ว แล้วรอแปบนึงให้เห็นแอนิเมชัน
                await saveGame(newState);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
               
        // 1. Play Card Logic (AI Loop)
        let isPlayingCards = true;
        while (isPlayingCards) {
            // คัดกรองการ์ดในมือที่ AI "สามารถจ่ายค่าคอสต์ได้" และ "มีที่ว่างในสนาม"
            const playableCards = newState.player2.hand.filter(c => {
                if (c.cost > newState.player2.energy) return false;
                
                // เช็คพื้นที่ก่อนลง
                const isTrapOrSpell = c.type === 'spell' || c.type === 'trap';
                const isUnit = c.type === 'unit';
                const isSummonSpell = c.effect === 'summon_from_deck';
                
                // ข้ามการ์ดกับดักถ้าสล็อตเต็ม 3 (แต่เวทย์มนต์ใช้แล้วทิ้งใช้ได้)
                if (isTrapOrSpell && !['field_buff', 'summon_from_deck', 'heal_player', 'damage_player'].includes(c.effect) && newState.player2.field.traps.length >= 3) return false;
                
                // ข้ามยูนิตถ้าสล็อตเต็ม 5
                if (isUnit && newState.player2.field.units.length >= 5) return false;
                if (isSummonSpell && newState.player2.field.units.length >= 5) return false;
                
                return true;
            });

            if (playableCards.length > 0) {
                // AI เล่นการ์ดที่แพงที่สุดก่อน (ให้เรียงจากคอสต์มากไปน้อย)
                playableCards.sort((a, b) => b.cost - a.cost);
                const cardToPlay = playableCards[0];
                const cardIndexInHand = newState.player2.hand.findIndex(c => c.id === cardToPlay.id);
                
                if (cardToPlay.type === 'spell' || cardToPlay.type === 'trap') {
                   if (cardToPlay.effect === 'field_buff') {
                       newState.fieldEffect = { ...cardToPlay.effectConfig, ownerId: 'player2' };
                       newState.message = `AI ใช้ Field: ${cardToPlay.name}`;
                   } else if (cardToPlay.effect === 'summon_from_deck') {
                       const token = { ...cardTemplates[0], id: Math.random(), canAttack: false };
                       newState.player2.field.units.push(token);
                       newState.message = `AI อัญเชิญ ${token.name} จากกอง!`;
                   } else if (cardToPlay.effect === 'heal_player') {
                       newState.player2.hp = Math.min(20, newState.player2.hp + (cardToPlay.effectValue || 5));
                       newState.message = `AI ใช้การ์ดเพิ่ม HP ${cardToPlay.effectValue || 5} หน่วย`;
                   } else if (cardToPlay.effect === 'damage_player') {
                       newState.player1.hp = Math.max(0, newState.player1.hp - (cardToPlay.effectValue || cardToPlay.attack));
                       newState.message = `AI ยิงสกิลใส่คุณ ${cardToPlay.effectValue || cardToPlay.attack} ดาเมจ!`;
                   } else {
                       newState.player2.field.traps.push({ ...cardToPlay, canAttack: false });
                       newState.message = `AI หมอบการ์ดไว้ 1 ใบ`;
                   }
                } else {
                    const canAttack = newState.turnNumber >= 2;
                    newState.player2.field.units.push({ ...cardToPlay, canAttack });
                    newState.message = `AI ลง ${cardToPlay.name}`;
                }
                
                newState.player2.energy -= cardToPlay.cost;
                newState.player2.hand.splice(cardIndexInHand, 1);
                
                await saveGame(newState);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                isPlayingCards = false; // จบลูปถ้าไม่เหลือการ์ดที่เล่นได้
            }
        }
        
        // 2. Attack Phase (AI Loop)
        let isAttacking = true;
        while (isAttacking) {
            // หายูนิตที่พร้อมโจมตีทั้งหมด
            const readyUnits = newState.player2.field.units.filter(u => u.canAttack && u.attack > 0);
            
            if (readyUnits.length > 0) {
                const attacker = readyUnits[0]; // หยิบมาโจมตีทีละตัว
                
                setAttackingId(attacker.id);
                await new Promise(resolve => setTimeout(resolve, 400));

                const attackerStats = getBuffedStats(attacker, newState.fieldEffect, 'player2');
                const targets = newState.player1.field.units;
                
                if (targets.length > 0) {
                    const defender = targets.find(u => isCardDefender(u));
                    const target = defender || targets[0]; 
                    
                    const targetStats = getBuffedStats(target, newState.fieldEffect, 'player1');
                    const newTargetHp = targetStats.hp - attackerStats.attack;
                    
                    newState.player1.field.units = newTargetHp > 0 
                        ? newState.player1.field.units.map(u => u.id === target.id ? { ...u, hp: newTargetHp } : u) 
                        : newState.player1.field.units.filter(u => u.id !== target.id);
                    
                    const targetTypeMsg = defender ? 'Defender' : 'Unit';
                    newState.message = `AI ${attacker.name} โจมตี ${targetTypeMsg}: ${target.name}!`;
                } else {
                    newState.player1.hp -= attackerStats.attack;
                    newState.message = `AI ${attacker.name} โจมตีคุณ!`;
                }
                 
                // รีเซ็ตสถานะ canAttack ของยูนิตที่เพิ่งตีไป จะได้ไม่ลูปตีซ้ำ
                newState.player2.field.units = newState.player2.field.units.map(u => u.id === attacker.id ? { ...u, canAttack: false } : u);
                 
                setAttackingId(null);
                await saveGame(newState);
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // เช็คถ้าผู้เล่นตายแล้ว ให้หยุดโจมตีทันที
                if (newState.player1.hp <= 0) {
                    isAttacking = false;
                }
            } else {
                isAttacking = false; // จบลูปถ้าทุกตัวโจมตีครบแล้ว
            }
        }
        // 3. End Turn
        const nextPlayer = 'player1';
        let newTurnNumber = newState.turnNumber;
        
        // *** FIX: Round Logic - Increment only when turn goes back to startingPlayer ***
        if (newState.startingPlayer) {
            if (nextPlayer === newState.startingPlayer) {
                newTurnNumber += 1;
            }
        } else {
            // Fallback if startingPlayer not set
            if (newState.currentTurn === 'player2') newTurnNumber += 1;
        }
        
        const calculatedMaxEnergy = Math.min(10, 2 + newTurnNumber);
        
        newState.currentTurn = nextPlayer;
        newState.turnNumber = newTurnNumber;
        newState.hasDrawnThisTurn = false;
        
        newState.player1.maxEnergy = calculatedMaxEnergy;
        newState.player1.energy = calculatedMaxEnergy;
        newState.player1.field.units = newState.player1.field.units.map(c => ({...c, canAttack: true}));
        
        newState.message = `เทิร์นของคุณ (Round ${newTurnNumber})`;
        
        await saveGame(newState);

      } catch (error) {
        console.error("AI Error", error);
      } finally {
        isAIProcessing.current = false;
      }
  };

  const createRoom = async (vsAI = false) => {
    setLoading(true);
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase(); 
    const deckSize = 35; 
    const p2Online = vsAI;
    const p2Tribe = 'Dog';
    
    const createDeck = (tribe) => {
        const list = [];
        const templates = cardTemplates.filter(c => c.tribe === tribe || c.tribe === 'Neutral');
        for(let i=0; i<35; i++) {
            list.push({ ...templates[i % templates.length], id: 1000 + i });
        }
        return list.sort(() => Math.random() - 0.5);
    };

    const initialGameState = {
      turnNumber: 0, currentTurn: null, cardIdCounter: 200, winner: null,
      message: vsAI ? 'โหมด VS AI: กดทอยลูกเต๋าเพื่อเริ่ม...' : 'รอผู้เล่นคนที่ 2 เข้าร่วม...',
      dice: { player1: null, player2: null, status: vsAI ? 'ready' : 'waiting' }, 
      fieldEffect: null, 
      player1: { hp: 20, energy: 0, maxEnergy: 3, deck: deckSize, deckList: createDeck('Cat'), hand: generateRandomHand(5, 1, 'Cat'), field: { units: [], traps: [] }, isOnline: true, tribe: 'Cat' },
      player2: { hp: 20, energy: 0, maxEnergy: 3, deck: deckSize, deckList: createDeck('Dog'), hand: generateRandomHand(5, 10, 'Dog'), field: { units: [], traps: [] }, isOnline: p2Online, tribe: p2Tribe }
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
    if (!inputRoomId) return alert("กรุณาใส่รหัสห้อง");
    setLoading(true);
    const roomRef = doc(db, "games", inputRoomId.toUpperCase());
    try {
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const data = roomSnap.data();
        if (data.dice.status !== 'waiting' && data.player2.isOnline) { alert('ห้องเต็ม!'); setLoading(false); return; }
        setRoomId(inputRoomId.toUpperCase()); setMyPlayerId('player2'); 
        await updateDoc(roomRef, { message: "ผู้เล่นครบแล้ว! ทอยลูกเต๋าหาคนเริ่มก่อน...", dice: { ...data.dice, status: 'ready' }, player2: { ...data.player2, isOnline: true } });
      } else { alert("ไม่พบห้องนี้!"); }
    } catch (error) { alert("Error joining room"); }
    setLoading(false);
  };
  
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = onSnapshot(doc(db, "games", roomId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        if (isVsAI && data.currentTurn === 'player2' && !data.winner) {
             handleAITurn(data);
        }
        if (!isVsAI && data.currentTurn !== null && data.winner === null) {
            const opponentId = myPlayerId === 'player1' ? 'player2' : 'player1';
            if (data[opponentId] && data[opponentId].isOnline === false && data.dice.status === 'done') {
                runTransaction(db, async (transaction) => {
                    const freshSnap = await transaction.get(doc(db, "games", roomId));
                    if (freshSnap.data().winner) return;
                    transaction.update(doc(db, "games", roomId), { winner: myPlayerId, message: "คู่ต่อสู้ออกจากเกม คุณชนะ!" });
                }).catch(e => console.error(e));
            }
        }
        setGameState(data); setCardIdCounter(data.cardIdCounter || 100); 
      } else { 
        alert("ห้องถูกปิดแล้ว (Room Closed)"); 
        setRoomId(null); 
        setGameState(null); 
      }
    });
    return () => unsubscribe(); 
  }, [roomId, myPlayerId, isVsAI]); 

  const handleDiceRoll = async () => {
    if (!gameState || !gameState.dice || gameState.winner || gameState.dice.status !== 'ready' || isRolling) return;
    const isOpponentReady = gameState.player2.isOnline;
    if (gameState.dice.status === 'ready' && !isOpponentReady) return alert("รอผู้เล่นอีกคนเข้าร่วมก่อนทอยลูกเต๋า");
    if (gameState.dice[myPlayerId]) return alert("คุณทอยไปแล้ว!");
    
    setIsRolling(true); 
    setTimeout(async () => {
        const roll = Math.floor(Math.random() * 6) + 1;
        setDiceResult(roll); 
        
        // 👇 อัปเดต: สุ่มเต๋าให้ AI ทันทีถ้าเล่นกับบอท
        let aiRoll = gameState.dice.player2;
        if (isVsAI) {
            aiRoll = Math.floor(Math.random() * 6) + 1;
        }

        const newDiceState = { 
            ...gameState.dice, 
            [myPlayerId]: roll,
            ...(isVsAI && { player2: aiRoll }) // ใส่ค่าเต๋า AI ลงไป
        };

        let newState = { ...gameState, dice: newDiceState, message: `${myPlayerId === 'player1' ? 'P1' : 'P2'} ทอยได้ ${roll}` };
        
        if (newDiceState.player1 !== null && newDiceState.player2 !== null) {
            const p1Roll = newDiceState.player1; 
            const p2Roll = newDiceState.player2;
            let startingPlayer = null; 
            let message = `P1: ${p1Roll}, P2: ${p2Roll}. `;
            
            if (p2Roll > p1Roll) startingPlayer = 'player2';
            else if (p1Roll > p2Roll) startingPlayer = 'player1';
            else {
                // 👇 อัปเดต: ถ้าเสมอ ให้รีเซ็ต AI เป็น null เพื่อให้ทอยใหม่ได้
                newState.dice = { player1: null, player2: null, status: 'ready' }; 
                newState.message = `${message} เสมอ! ทอยใหม่`;
                await saveGame(newState); 
                setIsRolling(false); 
                return;
            }
            
            newState.currentTurn = startingPlayer; 
            newState.turnNumber = 1; 
            newState.startingPlayer = startingPlayer;
            newState.player1.energy = 3; newState.player1.maxEnergy = 3;
            newState.player2.energy = 3; newState.player2.maxEnergy = 3;
            newState.dice = { ...newDiceState, status: 'done' };
            newState.message = `${message} ${startingPlayer === 'player1' ? 'P1' : 'P2'} เริ่มก่อน!`;
        }
        await saveGame(newState); 
        setIsRolling(false);
    }, 1500); 
  };
  
  const drawCard = (player) => {
    if (gameState.winner || gameState.currentTurn === null) return;
    if (player !== myPlayerId) return; 
    if (gameState.hasDrawnThisTurn || gameState[player].deck <= 0 || gameState[player].hand.length >= 6) return;
    
    const currentDeckList = gameState[player].deckList || [];
    if (currentDeckList.length === 0) return;

    const newCard = { ...currentDeckList[0], id: cardIdCounter, canAttack: false };
    const newDeckList = currentDeckList.slice(1);

    const newState = { ...gameState, cardIdCounter: cardIdCounter + 1, [player]: { ...gameState[player], hand: [...gameState[player].hand, newCard], deckList: newDeckList, deck: newDeckList.length }, hasDrawnThisTurn: true, message: `${player === 'player1' ? 'P1' : 'P2'} จั่วการ์ด!` };
    saveGame(newState);
  };

  const playCard = (card, player) => {
    if (gameState.winner || gameState.currentTurn !== player || player !== myPlayerId) return; 
    if (gameState[player].energy < card.cost) return alert('พลังงานไม่พอ!'); 
    const opponent = player === 'player1' ? 'player2' : 'player1';
    
    let newState = { ...gameState };
    let newPlayer = { ...newState[player] };
    let newOpponent = { ...newState[opponent] };
    
    if (card.type === 'spell' || card.type === 'trap') {
        if (newPlayer.field.traps.length >= 3) return alert('Trap/Spell เต็ม (3 ใบ)'); // คงไว้ที่ 3
        
        if (card.effect === 'field_buff') {
            newState.fieldEffect = { ...card.effectConfig, ownerId: player }; 
            newState.message = `${player === 'player1' ? 'P1' : 'P2'} ใช้การ์ดสนาม: ${card.name}!`;
        } 
        else if (card.effect === 'summon_from_deck') {
            // 👇 แก้ Unit จาก 3 เป็น 5
            if (newPlayer.field.units.length >= 5) return alert('Unit เต็ม (5 ใบ) ลงไม่ได้'); 
            const targetTribe = card.effectConfig.targetTribe;
            const deckList = newPlayer.deckList || [];
            const foundIndex = deckList.findIndex(c => c.tribe === targetTribe && c.type === 'unit');
            
            if (foundIndex !== -1) {
                const summonedUnit = { ...deckList[foundIndex], id: cardIdCounter + 99, canAttack: newState.turnNumber >= 2 };
                newPlayer.field.units.push(summonedUnit);
                newPlayer.deckList.splice(foundIndex, 1);
                newPlayer.deck = newPlayer.deckList.length;
                newState.message = `${player === 'player1' ? 'P1' : 'P2'} อัญเชิญ ${summonedUnit.name} จากกอง!`;
                newState.cardIdCounter += 1;
            } else {
                newState.message = `ไม่มี ${targetTribe} ในกองการ์ด!`;
            }
        }
        else if (card.effect === 'heal_player') {
            newPlayer.hp = Math.min(20, newPlayer.hp + (card.effectValue || 0));
        }
        else if (card.effect === 'damage_player') {
            newOpponent.hp = Math.max(0, newOpponent.hp - (card.effectValue || 0));
        }
        else {
            newPlayer.field.traps.push({ ...card, canAttack: false });
        }
    } else {
        // 👇 แก้ Unit จาก 3 เป็น 5
        if (newPlayer.field.units.length >= 5) return alert('Unit เต็ม (5 ใบ)'); 
        const canAttackImmediately = gameState.turnNumber >= 2;
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
    if (!card.canAttack) return alert("Unit นี้ยังโจมตีไม่ได้");
    if (card.type !== 'unit') return alert("การ์ดนี้ไม่สามารถโจมตีได้");
    if (card.attack === 0) return alert("Defender โจมตีไม่ได้!");
    setLocalAttackingCard(card); 
  };

  // *** MODIFY: Add Animation Delay to attackCard ***
  const attackCard = (targetCard, targetPlayer) => {
    if (gameState.winner || !localAttackingCard) return;
    if (targetCard.type !== 'unit' || targetPlayer === myPlayerId) return; 
    
    // *** FIX: Check if opponent has OTHER defenders we must hit first ***
    const hasOtherDefender = gameState[targetPlayer].field.units.some(u => isCardDefender(u) && u.id !== targetCard.id);
    if (hasOtherDefender && !isCardDefender(targetCard)) return alert('ต้องตี Defender ก่อน!');

    const attacker = localAttackingCard;
    const attackerPlayer = gameState.currentTurn;
    
    setAttackingId(attacker.id);

    setTimeout(() => {
        const attackerStats = getBuffedStats(attacker, gameState.fieldEffect, attackerPlayer);
        const targetStats = getBuffedStats(targetCard, gameState.fieldEffect, targetPlayer);

        const newTargetHp = targetStats.hp - attackerStats.attack; 

        const newState = { ...gameState, 
            [attackerPlayer]: { ...gameState[attackerPlayer], field: { ...gameState[attackerPlayer].field, units: gameState[attackerPlayer].field.units.map(c => c.id === attacker.id ? { ...c, canAttack: false } : c) } },
            [targetPlayer]: { ...gameState[targetPlayer], field: { ...gameState[targetPlayer].field, units: newTargetHp > 0 ? gameState[targetPlayer].field.units.map(c => c.id === targetCard.id ? { ...c, hp: newTargetHp } : c) : gameState[targetPlayer].field.units.filter(c => c.id !== targetCard.id) } },
            message: `${attacker.name} (${attackerStats.attack}) โจมตี ${targetCard.name}!` };
        
        saveGame(newState);
        setLocalAttackingCard(null); 
        setAttackingId(null);
    }, 400);
  };

  // *** MODIFY: Add Animation Delay to attackPlayer ***
  const attackPlayer = (targetPlayer) => {
    if (gameState.winner || !localAttackingCard) return;
    if (targetPlayer === myPlayerId) { setLocalAttackingCard(null); return; }
    const opponent = targetPlayer;
    
    // *** FIX: ต้องกำจัด Unit ทั้งหมดก่อนถึงจะตีหน้าได้ (Strict Rule) ***
    // ไม่ว่าจะมี Defender หรือไม่ ถ้ามี Unit อยู่ก็ตีหน้าไม่ได้
    if (gameState[opponent].field.units.length > 0) return alert('ต้องกำจัด Unit ฝ่ายตรงข้ามให้หมดก่อน!');

    const attacker = localAttackingCard;
    const attackerPlayer = gameState.currentTurn;
    
    setAttackingId(attacker.id);

    setTimeout(() => {
        const attackerStats = getBuffedStats(attacker, gameState.fieldEffect, attackerPlayer);
        const defenderTraps = gameState[opponent].field.traps;
        const trapIndex = defenderTraps.findIndex(c => c.type === 'trap');
        let newState = { ...gameState };

        if (trapIndex !== -1) {
            const trapCard = defenderTraps[trapIndex];
            const newAttackerHp = attacker.hp - trapCard.attack;
            newState[opponent].field.traps = defenderTraps.filter(c => c.id !== trapCard.id);
            newState[attackerPlayer].field.units = newState[attackerPlayer].field.units.map(c => c.id === attacker.id ? (newAttackerHp > 0 ? { ...c, hp: newAttackerHp, canAttack: false } : null) : c).filter(c => c !== null);
            newState.message = `กับดักทำงาน! สวนกลับ ${trapCard.attack} ดาเมจ!`;
        } else {
            newState[opponent].hp = Math.max(0, newState[opponent].hp - attackerStats.attack);
            newState[attackerPlayer].field.units = newState[attackerPlayer].field.units.map(c => c.id === attacker.id ? { ...c, canAttack: false } : c);
            newState.message = `${attacker.name} โจมตีผู้เล่น! -${attackerStats.attack} HP`;
        }
        saveGame(newState);
        setLocalAttackingCard(null);
        setAttackingId(null); 
    }, 400);
  };

  const endTurn = () => {
    if (gameState.winner || gameState.currentTurn !== myPlayerId) return;
    
    if (gameState[myPlayerId].hand.length > 5) {
        return alert("การ์ดในมือเกิน 5 ใบ! กรุณาลงการ์ดให้เหลือ 5 ใบก่อนจบเทิร์น");
    }

    const nextPlayer = gameState.currentTurn === 'player1' ? 'player2' : 'player1';
    let newTurnNumber = gameState.turnNumber;
    
    // *** FIX: Round Logic - Increment only when turn goes back to startingPlayer ***
    if (gameState.startingPlayer) {
        if (nextPlayer === gameState.startingPlayer) {
            newTurnNumber += 1;
        }
    } else {
        if (gameState.currentTurn === 'player2') newTurnNumber += 1;
    }
    
    const calculatedMaxEnergy = Math.min(10, 2 + newTurnNumber);
    const newState = { ...gameState, currentTurn: nextPlayer, turnNumber: newTurnNumber, hasDrawnThisTurn: false, 
        [nextPlayer]: { ...gameState[nextPlayer], maxEnergy: calculatedMaxEnergy, energy: calculatedMaxEnergy, 
            field: { units: gameState[nextPlayer].field.units.map(c => ({ ...c, canAttack: true })), traps: gameState[nextPlayer].field.traps } },
        message: `เปลี่ยนเทิร์นเป็น ${nextPlayer === 'player1' ? 'P1' : 'P2'} (Round ${newTurnNumber})` };
    saveGame(newState);
  };

  // *** Helper for visual check ***
  const opponentHasUnits = (opponentId) => {
      return gameState[opponentId].field.units.length > 0;
  };

  // --- Design Components ---
  const CardBack = ({ type }) => {
    const sizeClasses = type === 'hand' ? "w-32 h-44" : "w-24 h-32";
    return <div className={`bg-slate-800 border-4 border-slate-600 rounded-lg shadow-2xl relative flex items-center justify-center ${sizeClasses} overflow-hidden`}><div className="absolute inset-0 bg-cover bg-center opacity-100" style={{backgroundImage: `url(${CARD_BACK_URL})`}}></div></div>;
  };
  
  const CardComponent = ({ card, onClick, isPlayable, isAttacking, isField, showAttackGlow, onMouseEnter, onMouseLeave, ownerId }) => {
    const isTaunt = isCardDefender(card); 
    const sizeClasses = isField ? "w-24 h-36 text-[8px]" : "w-32 h-48 text-[10px]";
    const hoverClass = !isField && isPlayable ? 'hover:-translate-y-6 hover:scale-110 z-20 transition-all duration-200' : '';
    const stats = isField ? getBuffedStats(card, gameState?.fieldEffect, ownerId) : { attack: card.attack, hp: card.hp, isBuffed: false };
    const borderColor = card.type === 'unit' ? 'border-slate-300' : card.type === 'spell' ? (card.effect === 'field_buff' ? 'border-yellow-400' : 'border-purple-300') : 'border-red-300';
    const bgColor = 'bg-slate-900';

    const isMoving = card.id === attackingId;
    const moveClass = isMoving ? (ownerId === 'player1' ? 'translate-y-[-150px] scale-110 z-50 transition-transform duration-300 ease-in-out' : 'translate-y-[150px] scale-110 z-50 transition-transform duration-300 ease-in-out') : '';

    return (
      <div 
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`relative ${bgColor} border-[3px] ${borderColor} rounded-lg shadow-xl flex flex-col ${sizeClasses} ${hoverClass} ${!isPlayable && !isField ? 'opacity-70 grayscale' : 'opacity-100'} select-none overflow-hidden ${moveClass}
        ${isAttacking ? 'ring-4 ring-red-500 scale-105' : ''}
        ${showAttackGlow ? 'ring-4 ring-yellow-400 scale-105' : ''}`}
      >
        <div className="relative bg-slate-200 text-black font-bold px-1 py-0.5 flex items-center justify-between border-b-2 border-slate-400 h-6">
              <div className="absolute -left-1.5 -top-1.5 w-8 h-8 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white font-black text-sm shadow-sm z-10">
                 {card.cost}
              </div>
              <div className="ml-5 w-full text-center truncate leading-tight uppercase tracking-tighter">
                 {card.name}
              </div>
        </div>

        <div className="relative w-full h-1/2 bg-black border-b-2 border-slate-500 overflow-hidden">
            <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded-tl-md border-t border-l border-white/20">
                {card.tribe}
            </div>
            {isTaunt && <div className="absolute top-1 right-1 bg-white text-black text-[8px] font-bold px-1 rounded shadow-sm">🛡️ DEF</div>}
            {isField && card.canAttack && <div className="absolute top-1 right-1 bg-red-600 text-white text-[8px] font-bold px-1 rounded shadow-sm animate-pulse">⚔️ ATK</div>}
        </div>

        <div className="bg-slate-700 text-white text-[8px] text-center py-0.5 font-bold uppercase border-b border-slate-600">
            {card.effect === 'field_buff' ? 'FIELD' : card.type}
        </div>

        <div className="flex-grow bg-slate-100 p-1 flex items-center justify-center text-center">
            <p className="text-slate-900 font-serif leading-tight line-clamp-3 font-medium">
               {card.description}
            </p>
        </div>

        {(card.type === 'unit' || card.attack > 0) && (
             <div className="h-6 bg-slate-800 flex justify-between items-center px-1 border-t-2 border-slate-400">
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
    const borderColor = card.type === 'unit' ? 'border-slate-300' : card.type === 'spell' ? 'border-purple-300' : 'border-red-300';

    return (
      <div className="fixed top-1/2 left-8 -translate-y-1/2 z-50 hidden lg:block animate-in slide-in-from-left-10 duration-300">
          <div className={`relative bg-slate-900 border-4 ${borderColor} rounded-xl shadow-2xl w-[280px] h-[400px] flex flex-col overflow-hidden`}>
               <div className="relative bg-slate-200 text-black font-bold px-2 py-2 flex items-center justify-between border-b-4 border-slate-400 h-12">
                    <div className="absolute -left-2 -top-2 w-12 h-12 bg-blue-600 rounded-full border-4 border-white flex items-center justify-center text-white font-black text-xl shadow-md z-10">
                        {card.cost}
                    </div>
                    <div className="ml-10 w-full text-center text-lg font-black uppercase tracking-tight">{card.name}</div>
               </div>
               <div className="w-full h-[180px] bg-black border-b-4 border-slate-600 relative">
                   <img src={card.imageUrl} className="w-full h-full object-cover" />
                   {isTaunt && <div className="absolute top-2 right-2 bg-white text-black font-bold px-2 py-1 rounded shadow">🛡️ DEFENDER</div>}
               </div>
               <div className="bg-slate-800 text-white text-xs text-center py-1 font-bold uppercase border-b border-slate-600 tracking-widest">
                    {card.type} • {card.tribe}
               </div>
               <div className="flex-grow bg-slate-100 p-4 flex items-center justify-center text-center border-b-4 border-slate-400">
                    <p className="text-slate-900 font-serif text-base font-medium leading-snug">
                        {card.description}
                    </p>
               </div>
               {(card.type === 'unit' || card.attack > 0) && (
                   <div className="h-12 bg-slate-800 flex justify-between items-center px-4">
                        <div className="flex items-center gap-2 text-orange-500 text-2xl font-black">
                            <Swords size={28} /> {card.attack}
                        </div>
                        {card.type === 'unit' && (
                            <div className="flex items-center gap-2 text-emerald-500 text-2xl font-black">
                                {card.hp} <Shield size={28} />
                            </div>
                        )}
                   </div>
               )}
          </div>
      </div>
    );
  };

  // --- Layout Components (StatusBadge, DeckDisplay, FieldDisplay) ---
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

  const DeckDisplay = ({ player }) => {
      const data = gameState[player];
      const isMe = player === myPlayerId;
      const isCurrentTurn = gameState.currentTurn === player;
      const canDraw = isCurrentTurn && !gameState.hasDrawnThisTurn && data.deck > 0 && data.hand.length < 6;
      
      return (
          <div className="flex gap-2 items-center">
              {!isMe ? (
                  <div className="w-12 h-16 bg-slate-800 border border-slate-600 rounded flex items-center justify-center text-slate-500 text-[10px]">Deck<br/>{data.deck}</div>
              ) : (
                  <button onClick={() => drawCard(player)} disabled={!canDraw} 
                      className={`w-16 h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all relative
                      ${canDraw ? 'bg-indigo-900 border-indigo-400 hover:scale-105 text-white' : 'bg-slate-800 border-slate-600 text-slate-500 opacity-70'}`}>
                      <span className="text-[10px] font-bold">DECK</span>
                      <span className="text-xl font-bold">{data.deck}</span>
                      {isCurrentTurn && canDraw && <div className="absolute -top-2 -right-2 bg-green-500 w-4 h-4 rounded-full animate-ping"></div>}
                  </button>
              )}
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
        return <div className="flex justify-center gap-2 flex-wrap min-h-[180px] items-center px-4">{sortedHand.map(card => <CardComponent key={card.id} card={card} onClick={() => playCard(card, myPlayerId)} isPlayable={isCurrentTurn && data.energy >= card.cost} onMouseEnter={() => setShowCardDetail(card)} onMouseLeave={() => setShowCardDetail(null)} />)}</div>;
    }
    return <div className="flex justify-center gap-1 min-h-[120px] items-center px-4">{data.hand.map((_, i) => <CardBack key={i} type="hand" />)}</div>;
  };

  const PlayerArea = ({ player }) => {
    const data = gameState[player];
    const isMe = player === myPlayerId;
    const isCurrentTurn = gameState.currentTurn === player;
    const opponentId = isMe ? (player === 'player1' ? 'player2' : 'player1') : myPlayerId;
    
    // *** FIX: ชื่อเรืองแสงถ้าไม่มี Unit ขวาง (ต้องกำจัดหมดก่อน) ***
    const canAttackPlayer = localAttackingCard && gameState.currentTurn === myPlayerId && !opponentHasUnits(player); 
    const isOpponent = !isMe;

    return (
      <div className={`flex ${isOpponent ? 'flex-col-reverse' : 'flex-col'} gap-1 w-full max-w-6xl mx-auto`}>
          <div className="flex justify-between items-center w-full px-2 h-[160px]">
              <div className="w-24 flex justify-center"><DeckDisplay player={player} /></div>
              <div className="flex-1 px-2 h-full"><FieldDisplay player={player} data={data.field} isMe={isMe} isCurrentTurn={isCurrentTurn} /></div>
              <div className="w-48"><StatusBadge player={player} data={data} isMe={isMe} isCurrentTurn={isCurrentTurn} canAttackPlayer={isOpponent ? canAttackPlayer : false} /></div>
          </div>
          <div className="w-full"><HandArea data={data} isMe={isMe} isCurrentTurn={isCurrentTurn} /></div>
      </div>
    );
  };
  
  const isGameStarted = gameState && gameState.dice && gameState.dice.status === 'done';

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
                        {loading ? <Loader2 className="animate-spin" /> : <><Plus size={20}/> สร้างห้องเล่นกับเพื่อน</>}
                    </button>
                    <button onClick={() => createRoom(true)} disabled={loading} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold hover:from-blue-500 hover:to-indigo-500 flex justify-center items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95">
                        {loading ? <Loader2 className="animate-spin" /> : <><Zap size={20}/> เล่นกับบอท (AI)</>}
                    </button>
                    <div className="relative pt-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500">หรือเข้าร่วม</span></div>
                    </div>
                    <div className="flex gap-2">
                        <input type="text" placeholder="ใส่รหัสห้อง 6 หลัก" className="flex-1 bg-slate-800 rounded-xl px-4 text-center border border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase placeholder:normal-case" value={inputRoomId} onChange={e=>setInputRoomId(e.target.value)} maxLength={6} />
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
                            <div className="text-blue-300 font-medium animate-pulse mb-6 min-h-[24px]">{gameState?.message}</div>
                            
                            <div className="flex justify-center gap-8 mb-8 items-end">
                                 <div className="flex flex-col items-center gap-2 transition-all duration-300">
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black shadow-xl border-4 
                                        ${gameState.dice?.player1 ? 'bg-white text-slate-900 border-blue-500' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>
                                        {isRolling && myPlayerId === 'player1' ? <Loader2 className="animate-spin text-blue-500" /> : (gameState.dice?.player1 || '?')}
                                    </div>
                                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${myPlayerId === 'player1' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Player 1</span>
                                 </div>
                                 <div className="text-slate-600 font-black text-2xl pb-6">VS</div>
                                 <div className="flex flex-col items-center gap-2 transition-all duration-300">
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black shadow-xl border-4
                                        ${gameState.dice?.player2 ? 'bg-white text-slate-900 border-red-500' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>
                                        {gameState.dice?.player2 || '?'}
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
                            ) : (
                                <div className="text-slate-500 italic text-sm">Waiting for players...</div>
                            )}
                        </div>
                        
                        <div className="flex justify-center">
                            <button onClick={closeRoom} className="text-red-500 hover:text-red-400 flex items-center gap-2 text-sm border border-red-900/50 px-4 py-2 rounded-lg bg-red-950/30 hover:bg-red-900/50 transition-colors">
                                <Trash2 size={16} /> ปิดห้อง / ยกเลิก
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
                      <button onClick={() => window.location.reload()} className="bg-white text-black px-8 py-3 rounded-full font-bold text-lg hover:scale-105 transition-transform">Play Again</button>
                      <button onClick={closeRoom} className="bg-red-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-red-500 transition-colors flex items-center gap-2"><Trash2 size={20} /> Close Room</button>
                  </div>
              </div>
          </div>
      );
  }

  // --- Main Game Board ---
  return (
    <div className="w-full h-screen bg-slate-950 text-white overflow-hidden relative flex flex-col">
        
        {/* *** Field Effect Visuals *** */}
        <div className={`absolute inset-0 opacity-20 pointer-events-none transition-all duration-1000 ${gameState.fieldEffect ? (gameState.fieldEffect.targetTribe === 'Cat' ? 'bg-yellow-600' : 'bg-orange-900') : 'bg-slate-900'}`}></div>
        {gameState.fieldEffect && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-0 opacity-30 pointer-events-none">
                <span className="text-[100px] font-black text-white uppercase tracking-widest">{gameState.fieldEffect.targetTribe} WORLD</span>
            </div>
        )}

        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40">
             <button onClick={endTurn} disabled={gameState.currentTurn !== myPlayerId} className={`w-24 h-24 rounded-full font-black text-lg border-4 shadow-xl flex items-center justify-center transition-all ${gameState.currentTurn === myPlayerId ? 'bg-orange-500 border-orange-300 hover:scale-110 cursor-pointer animate-pulse' : 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed'}`}>END<br/>TURN</button>
        </div>
        
        <button onClick={closeRoom} className="fixed top-4 left-4 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg shadow-xl border-2 border-red-400 transition-all z-50 font-bold text-xs flex items-center gap-2">
            <Trash2 size={16} /> ปิดห้อง
        </button>

        <CardPreview card={showCardDetail} />
        <div className="flex-grow flex flex-col justify-between py-2 max-w-full mx-auto w-full relative z-10">
            <PlayerArea player={myPlayerId === 'player1' ? 'player2' : 'player1'} isOpponent={true} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"><div className="bg-slate-900/90 px-8 py-2 rounded-full border border-slate-500 backdrop-blur shadow-xl"><span className="text-lg font-bold text-blue-300">{gameState.message}</span></div></div>
            <PlayerArea player={myPlayerId} />
        </div>
        <button onClick={() => setShowRules(!showRules)} className="fixed bottom-6 right-6 bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-full shadow-xl border-2 border-slate-500 transition-all z-40"><X size={24} /></button>
        {showRules && (
          <div className="fixed bottom-20 right-6 bg-slate-800/95 backdrop-blur-md text-slate-200 p-5 rounded-2xl shadow-2xl border border-slate-600 max-w-xs z-40">
             <h3 className="font-bold text-lg text-white mb-3">วิธีเล่น</h3>
             <ul className="text-xs space-y-2 text-slate-300"><li>• Unit Atk 0 (Defender) ตีไม่ได้</li><li>• Unit ตี Unit ฟรี (เลือดเราไม่ลด)</li><li>• Trap/Spell ในสนามถูกซ่อน</li><li>• การ์ดในมือสูงสุด 5 ใบ</li><li>• Energy สูงสุด 10 หน่วย</li></ul>
          </div>
        )}
    </div>
  );
};

export default CardGamePrototype;