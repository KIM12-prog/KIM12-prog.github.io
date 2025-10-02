// =======================================================================
//  アプリケーション全体を管理するメインスクリプト
// =======================================================================

// --- グローバル変数 ---
let currentUser = null;
let userPlan = 'free';
let wordbooks = [];
let reviewList = [];
let currentLearningSession = null;

// --- DOM要素の参照 (グローバルに宣言し、後で初期化) ---
let navLinks, pages, creationPage, learningPage, searchPage, editModalElements, authElements;
let editModal, authModal;

// =======================================================================
//  アプリケーションの起動処理
// =======================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM要素への参照をグローバル変数に格納 (ページが完全に読み込まれてから)
    initializeDOMReferences();
    
    // 2. すべてのボタンや入力欄の操作を一度だけ設定
    setupEventListeners();

    // 3. Firebaseの認証状態の変化を監視し、状態に応じてアプリを初期化
    auth.onAuthStateChanged(user => {
        initializeApp(user);
    });
});

// --- メイン初期化関数 ---
async function initializeApp(user) {
    currentUser = user;
    userPlan = 'free';
    
    updateLoginUI(user);

    if (currentUser) {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) userPlan = userDoc.data().plan || 'free';
    }
    await loadData();
    switchPage('learning-page');
}

// --- DOM要素の初期化 (一度だけ実行) ---
function initializeDOMReferences() {
    authModal = new bootstrap.Modal(document.getElementById('auth-modal'));
    editModal = new bootstrap.Modal(document.getElementById('edit-word-modal'));
    navLinks = document.querySelectorAll('.nav-link');
    pages = document.querySelectorAll('.page');
    creationPage = {
        newNameInput: document.getElementById('new-wordbook-name'),
        createBtn: document.getElementById('create-wordbook-btn'),
        addWordSelect: document.getElementById('add-word-wordbook-select'),
        newEnglishInput: document.getElementById('new-english-word'),
        newJapaneseInput: document.getElementById('new-japanese-word'),
        addWordBtn: document.getElementById('add-word-btn'),
        deleteSelect: document.getElementById('delete-wordbook-select'),
        deleteBtn: document.getElementById('delete-wordbook-btn'),
        viewSelect: document.getElementById('view-wordbook-select'),
        wordList: document.getElementById('word-list'),
    };
    learningPage = {
        wordbookSelect: document.getElementById('learning-wordbook-select'),
        startBtn: document.getElementById('start-learning-btn'),
        startReviewBtn: document.getElementById('start-review-btn'),
        reviewCount: document.getElementById('review-count'),
        learningArea: document.getElementById('learning-area'),
        settings: document.getElementById('learning-settings'),
        flashcardContainer: document.getElementById('flashcard-container'),
        flashcard: document.getElementById('flashcard'),
        cardFrontText: document.getElementById('card-front-text'),
        pronunciationBtn: document.getElementById('play-pronunciation-btn'),
        cardBack: document.querySelector('.card-back'),
        progressText: document.getElementById('progress-text'),
        cardControls: document.getElementById('card-controls'),
        unknownBtn: document.getElementById('unknown-btn'),
        knownStockBtn: document.getElementById('known-stock-btn'),
        knownBtn: document.getElementById('known-btn'),
        stopBtn: document.getElementById('stop-learning-btn'),
    };
    searchPage = {
        searchInput: document.getElementById('search-word-input'),
        searchBtn: document.getElementById('google-translate-btn'),
        addEnglishInput: document.getElementById('searched-english-word'),
        addJapaneseInput: document.getElementById('searched-japanese-word'),
        addSelect: document.getElementById('add-searched-word-select'),
        addBtn: document.getElementById('add-from-search-btn'),
    };
    editModalElements = {
        wordbookIdInput: document.getElementById('edit-wordbook-id'),
        wordEnInput: document.getElementById('edit-word-en'),
        englishInput: document.getElementById('edit-english-word'),
        japaneseInput: document.getElementById('edit-japanese-word'),
        saveBtn: document.getElementById('save-edit-btn'),
    };
    authElements = {
        loginMenu: document.getElementById('login-menu'),
        userMenu: document.getElementById('user-menu'),
        userEmailDisplay: document.getElementById('user-email-display'),
        emailInput: document.getElementById('email-input'),
        passwordInput: document.getElementById('password-input'),
        loginBtn: document.getElementById('login-btn'),
        signupBtn: document.getElementById('signup-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        authError: document.getElementById('auth-error'),
        upgradeBtn: document.getElementById('upgrade-btn'),
    };
}


// --- データ同期 ---
async function mergeLocalDataToFirestore(userId) {
    const localBooksData = localStorage.getItem('my-wordbooks');
    if (!localBooksData) return;
    const localBooks = JSON.parse(localBooksData);
    if (!localBooks || localBooks.length === 0) return;
    if (confirm("お使いのデバイスに未同期の単語帳データが見つかりました。アカウントに統合しますか？")) {
        try {
            const batch = db.batch();
            const wordbooksRef = db.collection('users').doc(userId).collection('wordbooks');
            for (const book of localBooks) {
                const newBookRef = wordbooksRef.doc();
                batch.set(newBookRef, { name: book.name, words: book.words || [] });
            }
            await batch.commit();
            localStorage.removeItem('my-wordbooks');
            alert("データの統合が完了しました！");
        } catch (error) {
            console.error("データ統合エラー:", error);
            alert("データの統合中にエラーが発生しました。");
        }
    }
}

// --- データ操作 ---
async function loadData() {
    if (currentUser) {
        try {
            const wordbooksSnapshot = await db.collection('users').doc(currentUser.uid).collection('wordbooks').get();
            wordbooks = wordbooksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const reviewSnapshot = await db.collection('users').doc(currentUser.uid).collection('reviewList').doc('default').get();
            reviewList = reviewSnapshot.exists ? reviewSnapshot.data().words : [];
        } catch (error) {
            console.error("Firestoreからのデータ読み込みエラー:", error);
            wordbooks = []; reviewList = [];
        }
    } else {
        const booksData = localStorage.getItem('my-wordbooks');
        wordbooks = booksData ? JSON.parse(booksData) : [];
        const reviewData = localStorage.getItem('my-review-list');
        reviewList = reviewData ? JSON.parse(reviewData) : [];
    }
    updateAllUI();
}

async function saveData() {
    if (currentUser) {
        try {
            const reviewRef = db.collection('users').doc(currentUser.uid).collection('reviewList').doc('default');
            await reviewRef.set({ words: reviewList }, { merge: true });
        } catch (error) {
            console.error("Firestoreへの保存エラー:", error);
        }
    } else {
        localStorage.setItem('my-wordbooks', JSON.stringify(wordbooks));
        localStorage.setItem('my-review-list', JSON.stringify(reviewList));
    }
}

// --- UI更新 ---
function updateAllUI() {
    updateWordbookSelects();
    updateWordList();
    updateReviewCount();
}

function updateLoginUI(user) {
    if (user) {
        authElements.loginMenu.style.display = 'none';
        authElements.userMenu.style.display = 'block';
        authElements.userEmailDisplay.textContent = user.email;
    } else {
        authElements.loginMenu.style.display = 'block';
        authElements.userMenu.style.display = 'none';
    }
}

function updateWordbookSelects() {
    const selects = document.querySelectorAll('select[id$="-select"]');
    selects.forEach(select => {
        const currentVal = select.value;
        select.innerHTML = '';
        if (wordbooks.length === 0) {
            select.innerHTML = '<option value="" disabled>単語帳がありません</option>';
        } else {
            wordbooks.forEach(book => {
                const optionValue = currentUser ? book.id : book.name;
                const option = new Option(book.name, optionValue);
                select.add(option);
            });
            select.value = currentVal;
        }
    });
}

function updateWordList() {
    const selectedValue = creationPage.viewSelect.value;
    creationPage.wordList.innerHTML = '';
    const selectedBook = currentUser ? wordbooks.find(b => b.id === selectedValue) : wordbooks.find(b => b.name === selectedValue);
    if (selectedBook) {
        if (!selectedBook.words || selectedBook.words.length === 0) {
            creationPage.wordList.innerHTML = '<li class="list-group-item text-muted">単語が登録されていません。</li>';
            return;
        }
        const sortedWords = [...selectedBook.words].sort((a, b) => a.en.localeCompare(b.en));
        sortedWords.forEach(word => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            const bookId = currentUser ? selectedBook.id : selectedBook.name;
            li.innerHTML = `
                <span>
                    <strong>${word.en}</strong><br><small class="text-muted">${word.jp}</small>
                    <button class="btn btn-light btn-sm list-item-pronunciation-btn" data-word="${word.en}"><i class="bi bi-volume-up-fill"></i></button>
                </span>
                <div>
                    <button class="btn btn-outline-secondary btn-sm edit-word-btn" data-wordbook-id="${bookId}" data-word-en="${word.en}"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-outline-danger btn-sm delete-word-btn" data-wordbook-id="${bookId}" data-word-en="${word.en}"><i class="bi bi-trash"></i></button>
                </div>`;
            creationPage.wordList.appendChild(li);
        });
    }
}

function updateReviewCount() {
    learningPage.reviewCount.textContent = reviewList.length;
    learningPage.startReviewBtn.disabled = reviewList.length === 0;
}

// --- イベントリスナー設定 ---
function setupEventListeners() {
    authElements.loginBtn.addEventListener('click', async () => {
        const email = authElements.emailInput.value;
        const password = authElements.passwordInput.value;
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            authModal.hide();
            await mergeLocalDataToFirestore(userCredential.user.uid);
        } catch (error) {
            authElements.authError.textContent = 'メールアドレスまたはパスワードが間違っています。';
        }
    });

    authElements.signupBtn.addEventListener('click', async () => {
        const email = authElements.emailInput.value;
        const password = authElements.passwordInput.value;
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await db.collection('users').doc(userCredential.user.uid).set({
                email: userCredential.user.email,
                plan: 'free',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            authModal.hide();
            await mergeLocalDataToFirestore(userCredential.user.uid);
        } catch (error) {
            if (error.code === 'auth/weak-password') {
                authElements.authError.textContent = 'パスワードは6文字以上で入力してください。';
            } else {
                authElements.authError.textContent = 'このメールアドレスは既に使用されているか、形式が正しくありません。';
            }
        }
    });

    authElements.logoutBtn.addEventListener('click', () => { auth.signOut(); });
    authElements.upgradeBtn.addEventListener('click', () => { alert('プレミアム機能の決済は現在準備中です。'); });

    navLinks.forEach(link => link.addEventListener('click', e => {
        e.preventDefault(); switchPage(e.currentTarget.dataset.page);
    }));

    creationPage.createBtn.addEventListener('click', async () => {
        const newName = creationPage.newNameInput.value.trim();
        if (!newName) return;

        // ▼▼▼ 【修正箇所】プランに応じた上限設定ロジック ▼▼▼
        if (userPlan !== 'premium') {
            const limit = currentUser ? 5 : 2; // ログインユーザーは5個、ゲストは2個
            if (wordbooks.length >= limit) {
                if (currentUser) {
                    alert(`無料プランでは単語帳は${limit}つまでです。プレミアムにアップグレードすると無制限に作成できます。`);
                } else {
                    alert(`単語帳は${limit}つまで作成できます。ログインすると${5}つまで作成可能になり、データをクラウドに保存できます。`);
                    authModal.show();
                }
                return;
            }
        }
        // ▲▲▲ 【修正箇所】ここまで ▲▲▲

        if (currentUser) {
            await db.collection('users').doc(currentUser.uid).collection('wordbooks').add({ name: newName, words: [] });
        } else {
            if (wordbooks.find(b => b.name === newName)) {
                alert('同じ名前の単語帳が既に存在します。'); return;
            }
            wordbooks.push({ name: newName, words: [] });
            await saveData();
        }
        creationPage.newNameInput.value = '';
        await loadData();
    });

    creationPage.deleteBtn.addEventListener('click', async () => {
        const selectedId = creationPage.deleteSelect.value;
        if (selectedId && confirm('本当にこの単語帳を削除しますか？')) {
            if (currentUser) {
                await db.collection('users').doc(currentUser.uid).collection('wordbooks').doc(selectedId).delete();
            } else {
                wordbooks = wordbooks.filter(book => book.name !== selectedId);
                await saveData();
            }
            await loadData();
        }
    });

    creationPage.addWordBtn.addEventListener('click', async () => {
        const selectedId = creationPage.addWordSelect.value;
        const newEn = creationPage.newEnglishInput.value.trim();
        const newJp = creationPage.newJapaneseInput.value.trim();
        if (selectedId && newEn && newJp) {
            if (currentUser) {
                const bookRef = db.collection('users').doc(currentUser.uid).collection('wordbooks').doc(selectedId);
                await bookRef.update({ words: firebase.firestore.FieldValue.arrayUnion({ en: newEn, jp: newJp }) });
            } else {
                const book = wordbooks.find(b => b.name === selectedId);
                if (book && !book.words.some(w => w.en.toLowerCase() === newEn.toLowerCase())) {
                    book.words.push({ en: newEn, jp: newJp });
                    await saveData();
                }
            }
            creationPage.newEnglishInput.value = '';
            creationPage.newJapaneseInput.value = '';
            await loadData();
        }
    });

    creationPage.viewSelect.addEventListener('change', updateWordList);
    
    creationPage.wordList.addEventListener('click', async e => {
        const pronunciationBtn = e.target.closest('.list-item-pronunciation-btn');
        const editBtn = e.target.closest('.edit-word-btn');
        const deleteBtn = e.target.closest('.delete-word-btn');
        if (pronunciationBtn) playPronunciation(pronunciationBtn.dataset.word);
        if (editBtn) {
            const { wordbookId, wordEn } = editBtn.dataset;
            const book = currentUser ? wordbooks.find(b => b.id === wordbookId) : wordbooks.find(b => b.name === wordbookId);
            const word = book.words.find(w => w.en === wordEn);
            if(word){
                editModalElements.wordbookIdInput.value = wordbookId;
                editModalElements.wordEnInput.value = word.en;
                editModalElements.englishInput.value = word.en;
                editModalElements.japaneseInput.value = word.jp;
                editModal.show();
            }
        }
        if (deleteBtn) {
            if (confirm('この単語を削除しますか？')) {
                const { wordbookId, wordEn } = deleteBtn.dataset;
                if (currentUser) {
                    const bookRef = db.collection('users').doc(currentUser.uid).collection('wordbooks').doc(wordbookId);
                    const book = wordbooks.find(b => b.id === wordbookId);
                    const wordToDelete = book.words.find(w => w.en === wordEn);
                    if (wordToDelete) await bookRef.update({ words: firebase.firestore.FieldValue.arrayRemove(wordToDelete) });
                } else {
                    const book = wordbooks.find(b => b.name === wordbookId);
                    book.words = book.words.filter(w => w.en !== wordEn);
                    await saveData();
                }
                await loadData();
            }
        }
    });

    editModalElements.saveBtn.addEventListener('click', async () => {
        const bookId = editModalElements.wordbookIdInput.value;
        const oldEn = editModalElements.wordEnInput.value;
        const newJp = editModalElements.japaneseInput.value.trim();
        if (currentUser) {
            const bookRef = db.collection('users').doc(currentUser.uid).collection('wordbooks').doc(bookId);
            const book = wordbooks.find(b => b.id === bookId);
            const newWords = book.words.map(w => w.en === oldEn ? { en: oldEn, jp: newJp } : w);
            await bookRef.update({ words: newWords });
        } else {
            const book = wordbooks.find(b => b.name === bookId);
            const word = book.words.find(w => w.en === oldEn);
            word.jp = newJp;
            await saveData();
        }
        await loadData();
        editModal.hide();
    });

    learningPage.startBtn.addEventListener('click', () => {
        const selectedId = learningPage.wordbookSelect.value;
        if (!selectedId) { alert('学習する単語帳を選択してください。'); return; }
        const book = currentUser ? wordbooks.find(b => b.id === selectedId) : wordbooks.find(b => b.name === selectedId);
        if (book && book.words && book.words.length > 0) {
            startLearning(book.words, false, selectedId);
        } else {
            alert('学習する単語がありません。');
        }
    });
    
    learningPage.startReviewBtn.addEventListener('click', () => {
        if(reviewList.length > 0) startLearning(reviewList, true);
        else alert('復習する単語がありません。');
    });

    learningPage.pronunciationBtn.addEventListener('click', e => { e.stopPropagation(); playPronunciation(learningPage.cardFrontText.textContent); });
    learningPage.stopBtn.addEventListener('click', stopLearning);
    learningPage.flashcard.addEventListener('click', () => learningPage.flashcard.classList.toggle('is-flipped'));
    learningPage.unknownBtn.addEventListener('click', () => handleAnswer('unknown'));
    learningPage.knownStockBtn.addEventListener('click', () => handleAnswer('stock'));
    learningPage.knownBtn.addEventListener('click', () => handleAnswer('known'));

    searchPage.searchBtn.addEventListener('click', () => {
        const query = searchPage.searchInput.value.trim();
        if (!query) return;
        const isJapanese = query.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/);
        const sl = isJapanese ? 'ja' : 'en', tl = isJapanese ? 'en' : 'ja';
        window.open(`https://translate.google.co.jp/?sl=${sl}&tl=${tl}&text=${encodeURIComponent(query)}&op=translate`, '_blank');
    });
    
    searchPage.addBtn.addEventListener('click', async () => {
        const selectedId = searchPage.addSelect.value;
        const newEn = searchPage.addEnglishInput.value.trim();
        const newJp = searchPage.addJapaneseInput.value.trim();
        if (selectedId && newEn && newJp) {
            if (currentUser) {
                const bookRef = db.collection('users').doc(currentUser.uid).collection('wordbooks').doc(selectedId);
                await bookRef.update({ words: firebase.firestore.FieldValue.arrayUnion({ en: newEn, jp: newJp }) });
            } else {
                const book = wordbooks.find(b => b.name === selectedId);
                if (book && !book.words.some(w => w.en.toLowerCase() === newEn.toLowerCase())) {
                    book.words.push({ en: newEn, jp: newJp });
                    await saveData();
                }
            }
            searchPage.addEnglishInput.value = '';
            searchPage.addJapaneseInput.value = '';
            await loadData();
            alert('単語を追加しました。');
        }
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(err => console.log('Service worker registration failed: ', err));
        });
    }
}

// --- 汎用関数 ---
function switchPage(targetId) {
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    navLinks.forEach(link => link.classList.remove('active'));
    document.querySelector(`[data-page="${targetId}"]`).classList.add('active');
}

function playPronunciation(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } else {
        alert('お使いのブラウザは音声読み上げに対応していません。');
    }
}

// --- 学習セッション ---
function startLearning(wordsToLearn, isReviewMode = false, bookId = null) {
    currentLearningSession = {
        words: [...wordsToLearn].sort(() => Math.random() - 0.5),
        currentIndex: 0,
        questionDirection: document.querySelector('input[name="question-direction"]:checked').value,
        unknownWords: [],
        stockWords: [],
        isReviewMode,
        wordbookId: bookId
    };
    learningPage.settings.classList.add('d-none');
    learningPage.learningArea.classList.remove('d-none');
    showNextWord();
}

function stopLearning() {
    learningPage.settings.classList.remove('d-none');
    learningPage.learningArea.classList.add('d-none');
    currentLearningSession = null;
}

function showNextWord() {
    if (!currentLearningSession) return;
    const session = currentLearningSession;
    if (session.currentIndex >= session.words.length) {
        finishLearning();
        return;
    }
    const word = session.words[session.currentIndex];
    learningPage.progressText.textContent = `${session.currentIndex + 1} / ${session.words.length}`;
    showFlashcardWord(word);
}

function showFlashcardWord(word) {
    learningPage.flashcardContainer.classList.remove('d-none');
    learningPage.cardControls.classList.remove('d-none');
    learningPage.flashcard.classList.remove('is-flipped');
    const { questionDirection } = currentLearningSession;
    learningPage.cardFrontText.textContent = (questionDirection === 'en-to-jp') ? word.en : word.jp;
    learningPage.cardBack.textContent = (questionDirection === 'en-to-jp') ? word.jp : word.en;
    learningPage.pronunciationBtn.style.display = (questionDirection === 'en-to-jp') ? 'flex' : 'none';
}

function handleAnswer(type) {
    if (!currentLearningSession) return;
    const word = currentLearningSession.words[currentLearningSession.currentIndex];
    if (type === 'unknown') {
        currentLearningSession.unknownWords.push(word);
    } else if (type === 'stock') {
        currentLearningSession.stockWords.push(word);
    }
    currentLearningSession.currentIndex++;
    // 先にカードを表面に戻す
    learningPage.flashcard.classList.remove('is-flipped');

    // 少し時間をおいてから次の単語を表示する
    setTimeout(() => {
        showNextWord();
    }, 250); // 0.25秒
}

async function finishLearning() {
    const session = currentLearningSession;
    const { unknownWords, stockWords, words, isReviewMode, wordbookId } = session;
    const knownWords = words.filter(w => !unknownWords.includes(w) && !stockWords.includes(w));
    
    unknownWords.forEach(unknownWord => {
        if (!reviewList.some(reviewWord => reviewWord.en === unknownWord.en)) {
            reviewList.push(unknownWord);
        }
    });

    if (isReviewMode) {
        const learnedInReview = [...knownWords, ...stockWords];
        reviewList = reviewList.filter(reviewWord =>
            !learnedInReview.some(learned => learned.en === reviewWord.en)
        );
    } else {
        const bookRefId = currentUser ? wordbookId : wordbooks.findIndex(b => b.name === wordbookId);
        if ( (currentUser && bookRefId) || (!currentUser && bookRefId > -1) ) {
            const book = currentUser ? wordbooks.find(b => b.id === bookRefId) : wordbooks[bookRefId];
            if (book) {
                book.words = book.words.filter(originalWord =>
                    !knownWords.some(known => known.en === originalWord.en)
                );
            }
        }
    }
    
    await saveData();
    alert('学習が完了しました！');
    stopLearning();
    await loadData();
}