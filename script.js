document.addEventListener('DOMContentLoaded', () => {
    // --- グローバル変数・定数 ---
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('.nav-link');
    let wordbooks = []; // [{ name: "単語帳名", words: [{en: "English", jp: "日本語"}] }]
    let reviewList = []; // [{en: "English", jp: "日本語"}]
    let currentLearningSession = null;
    const editModal = new bootstrap.Modal(document.getElementById('edit-word-modal'));

    // --- DOM要素の取得 ---
    const creationPage = {
        newNameInput: document.getElementById('new-wordbook-name'),
        createBtn: document.getElementById('create-wordbook-btn'),
        addWordSelect: document.getElementById('add-word-wordbook-select'),
        newEnglishInput: document.getElementById('new-english-word'),
        newJapaneseInput: document.getElementById('new-japanese-word'),
        addWordBtn: document.getElementById('add-word-btn'),
        viewSelect: document.getElementById('view-wordbook-select'),
        wordList: document.getElementById('word-list'),
        deleteSelect: document.getElementById('delete-wordbook-select'),
        deleteBtn: document.getElementById('delete-wordbook-btn'),
        exportBtn: document.getElementById('export-btn'),
        importBtn: document.getElementById('import-btn'),
        importFile: document.getElementById('import-file'),
    };

    const learningPage = {
        settings: document.getElementById('learning-settings'),
        learningArea: document.getElementById('learning-area'),
        wordbookSelect: document.getElementById('learning-wordbook-select'),
        startBtn: document.getElementById('start-learning-btn'),
        startReviewBtn: document.getElementById('start-review-btn'),
        reviewCount: document.getElementById('review-count'),
        stopBtn: document.getElementById('stop-learning-btn'),
        flashcard: document.getElementById('flashcard'),
        cardFront: document.querySelector('.card-front'),
        cardBack: document.querySelector('.card-back'),
        cardFrontText: document.getElementById('card-front-text'),
        pronunciationBtn: document.getElementById('play-pronunciation-btn'),
        unknownBtn: document.getElementById('unknown-btn'),
        knownStockBtn: document.getElementById('known-stock-btn'),
        knownBtn: document.getElementById('known-btn'),
        progressText: document.getElementById('progress-text'),
    };

    const editModalElements = {
        bookIndexInput: document.getElementById('edit-book-index'),
        wordIndexInput: document.getElementById('edit-word-index'),
        englishInput: document.getElementById('edit-english-word'),
        japaneseInput: document.getElementById('edit-japanese-word'),
        saveBtn: document.getElementById('save-edit-btn'),
    };

    // --- データ管理関数 ---
    const saveData = () => {
        localStorage.setItem('my-wordbooks', JSON.stringify(wordbooks));
        localStorage.setItem('my-review-list', JSON.stringify(reviewList));
    };

    const loadData = () => {
        const booksData = localStorage.getItem('my-wordbooks');
        const reviewData = localStorage.getItem('my-review-list');
        if (booksData) {
            wordbooks = JSON.parse(booksData);
        } else {
            wordbooks = [{ name: "サンプル単語帳", words: [{ en: "apple", jp: "りんご" }] }];
        }
        if (reviewData) {
            reviewList = JSON.parse(reviewData);
        }
    };

    // --- UI更新関数 ---
    const updateAllUI = () => {
        updateWordbookSelects();
        updateWordList();
        updateReviewCount();
    };

    const updateWordbookSelects = () => {
        const selects = document.querySelectorAll('select[id$="-select"]');
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '';
            if (wordbooks.length === 0) {
                select.innerHTML = '<option value="-1" disabled>単語帳がありません</option>';
            } else {
                wordbooks.forEach((book, index) => {
                    const option = new Option(book.name, index);
                    select.add(option);
                });
                if (currentValue < wordbooks.length) {
                    select.value = currentValue;
                }
            }
        });
    };

    const updateWordList = () => {
        const bookIndex = creationPage.viewSelect.value;
        creationPage.wordList.innerHTML = '';
        if (bookIndex >= 0 && wordbooks[bookIndex]) {
            if (wordbooks[bookIndex].words.length === 0) {
                 creationPage.wordList.innerHTML = '<li class="list-group-item text-muted">この単語帳には単語が登録されていません。</li>';
            } else {
                // 【追加】アルファベット順にソート
                const sortedWords = [...wordbooks[bookIndex].words].sort((a, b) => a.en.localeCompare(b.en));

                sortedWords.forEach((word, wordIndex) => { // wordIndexはソート後の配列におけるインデックス
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                    li.innerHTML = `
                        <span>
                            <strong>${word.en}</strong><br>
                            <small class="text-muted">${word.jp}</small>
                            <button class="btn btn-light btn-sm list-item-pronunciation-btn" data-word="${word.en}">
                                <i class="bi bi-volume-up-fill"></i>
                            </button>
                        </span>
                        <div>
                            <button class="btn btn-outline-secondary btn-sm edit-word-btn" data-book-index="${bookIndex}" data-word-index="${wordbooks[bookIndex].words.findIndex(w => w.en === word.en && w.jp === word.jp)}"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-outline-danger btn-sm delete-word-btn" data-book-index="${bookIndex}" data-word-index="${wordbooks[bookIndex].words.findIndex(w => w.en === word.en && w.jp === word.jp)}"><i class="bi bi-trash"></i></button>
                        </div>
                    `;
                    creationPage.wordList.appendChild(li);
                });
            }
        } else {
            creationPage.wordList.innerHTML = '<li class="list-group-item text-muted">表示する単語帳を選択してください。</li>';
        }
    };

    const updateReviewCount = () => {
        learningPage.reviewCount.textContent = reviewList.length;
        learningPage.startReviewBtn.disabled = reviewList.length === 0;
    };

    // --- ページ切り替え処理 ---
    const switchPage = (targetId) => {
        pages.forEach(page => page.classList.remove('active'));
        const targetPage = document.getElementById(targetId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        navLinks.forEach(link => link.classList.remove('active'));
        const targetLink = document.querySelector(`[data-page="${targetId}"]`);
        if (targetLink) {
            targetLink.classList.add('active');
        }
    };

    // --- 発音再生関数 ---
    const playPronunciation = (text) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        } else {
            alert('お使いのブラウザは音声読み上げに対応していません。');
        }
    };

    // --- イベントリスナー ---
    const setupEventListeners = () => {
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = e.currentTarget.dataset.page;
                if (pageId) {
                    switchPage(pageId);
                }
            });
        });

        // --- 単語帳管理ページ ---
        creationPage.createBtn.addEventListener('click', () => {
            const name = creationPage.newNameInput.value.trim();
            if (name && !wordbooks.some(book => book.name === name)) {
                wordbooks.push({ name, words: [] });
                saveData();
                updateAllUI();
                creationPage.newNameInput.value = '';
            } else if (!name) {
                alert('単語帳の名前を入力してください。');
            } else {
                alert('同じ名前の単語帳が既に存在します。');
            }
        });

        creationPage.addWordBtn.addEventListener('click', () => {
            const bookIndex = creationPage.addWordSelect.value;
            const en = creationPage.newEnglishInput.value.trim();
            const jp = creationPage.newJapaneseInput.value.trim();
            if (bookIndex >= 0 && en && jp) {
                wordbooks[bookIndex].words.push({ en, jp });
                saveData();
                // 選択中の単語帳に単語が追加された場合のみリストを更新
                if (creationPage.viewSelect.value == bookIndex) { // == で比較することに注意 (文字列と数値)
                    updateWordList();
                }
                creationPage.newEnglishInput.value = '';
                creationPage.newJapaneseInput.value = '';
            } else {
                alert('単語帳を選択し、英語と日本語の両方を入力してください。');
            }
        });

        creationPage.deleteBtn.addEventListener('click', () => {
            const bookIndex = parseInt(creationPage.deleteSelect.value, 10);
            if (bookIndex >= 0) {
                const bookName = wordbooks[bookIndex].name;
                if (confirm(`単語帳「${bookName}」を削除しますか？\nこの操作は元に戻せません。`)) {
                    wordbooks.splice(bookIndex, 1);
                    saveData();
                    updateAllUI();
                }
            } else {
                alert('削除する単語帳が選択されていません。');
            }
        });

        creationPage.viewSelect.addEventListener('change', updateWordList);

        // 【追加】単語リストの発音ボタンのイベントリスナー
        creationPage.wordList.addEventListener('click', (e) => {
            const pronunciationBtn = e.target.closest('.list-item-pronunciation-btn');
            if (pronunciationBtn) {
                const wordToSpeak = pronunciationBtn.dataset.word;
                if (wordToSpeak) {
                    playPronunciation(wordToSpeak);
                }
            }

            const editBtn = e.target.closest('.edit-word-btn');
            const deleteBtn = e.target.closest('.delete-word-btn');
            if (editBtn) {
                const { bookIndex, wordIndex } = editBtn.dataset;
                const word = wordbooks[bookIndex].words[wordIndex];
                editModalElements.bookIndexInput.value = bookIndex;
                editModalElements.wordIndexInput.value = wordIndex;
                editModalElements.englishInput.value = word.en;
                editModalElements.japaneseInput.value = word.jp;
                editModal.show();
            }
            if (deleteBtn) {
                const { bookIndex, wordIndex } = deleteBtn.dataset;
                if (confirm(`「${wordbooks[bookIndex].words[wordIndex].en}」を削除しますか？`)) {
                    wordbooks[bookIndex].words.splice(wordIndex, 1);
                    saveData();
                    updateWordList();
                }
            }
        });

        editModalElements.saveBtn.addEventListener('click', () => {
            const bookIndex = editModalElements.bookIndexInput.value;
            const wordIndex = editModalElements.wordIndexInput.value;
            const newEn = editModalElements.englishInput.value.trim();
            const newJp = editModalElements.japaneseInput.value.trim();
            if (newEn && newJp) {
                wordbooks[bookIndex].words[wordIndex] = { en: newEn, jp: newJp };
                saveData();
                updateWordList();
                editModal.hide();
            } else {
                alert('英語と日本語の両方を入力してください。');
            }
        });

        creationPage.exportBtn.addEventListener('click', () => {
            const dataStr = JSON.stringify({ wordbooks, reviewList }, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `wordbooks-backup-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        creationPage.importBtn.addEventListener('click', () => creationPage.importFile.click());

        creationPage.importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.wordbooks && Array.isArray(data.wordbooks) && data.reviewList && Array.isArray(data.reviewList)) {
                        if (confirm('現在の単語帳をすべて上書きしてインポートします。よろしいですか？')) {
                            wordbooks = data.wordbooks;
                            reviewList = data.reviewList;
                            saveData();
                            updateAllUI();
                            alert('データをインポートしました。');
                        }
                    } else {
                        alert('無効なファイル形式です。');
                    }
                } catch (error) {
                    alert('ファイルの読み込みに失敗しました。');
                } finally {
                    creationPage.importFile.value = '';
                }
            };
            reader.readAsText(file);
        });

        // --- 学習ページ ---
        learningPage.startBtn.addEventListener('click', () => {
            const bookIndex = learningPage.wordbookSelect.value;
            if (bookIndex >= 0 && wordbooks[bookIndex] && wordbooks[bookIndex].words.length > 0) {
                startLearning(wordbooks[bookIndex].words);
            } else {
                alert('学習する単語が含まれている単語帳を選択してください。');
            }
        });

        learningPage.pronunciationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const text = learningPage.cardFrontText.textContent;
            if (text && currentLearningSession && currentLearningSession.mode === 'en-to-jp') {
                playPronunciation(text);
            }
        });

        learningPage.startReviewBtn.addEventListener('click', () => startLearning(reviewList, true));
        learningPage.stopBtn.addEventListener('click', stopLearning);
        learningPage.flashcard.addEventListener('click', () => learningPage.flashcard.classList.toggle('is-flipped'));
        learningPage.unknownBtn.addEventListener('click', () => handleAnswer('unknown'));
        learningPage.knownStockBtn.addEventListener('click', () => handleAnswer('stock'));
        learningPage.knownBtn.addEventListener('click', () => handleAnswer('known'));

        // --- 単語検索ページ ---
        document.getElementById('google-translate-btn').addEventListener('click', () => {
            const query = document.getElementById('search-word-input').value.trim();
            if (!query) return;
            const isJapanese = query.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/);
            const sl = isJapanese ? 'ja' : 'en', tl = isJapanese ? 'en' : 'ja';
            window.open(`https://translate.google.co.jp/?sl=${sl}&tl=${tl}&text=${encodeURIComponent(query)}&op=translate`, '_blank');
        });

        document.getElementById('add-from-search-btn').addEventListener('click', () => {
            const bookIndex = document.getElementById('add-searched-word-select').value;
            const en = document.getElementById('searched-english-word').value.trim();
            const jp = document.getElementById('searched-japanese-word').value.trim();
            if (bookIndex >= 0 && en && jp) {
                wordbooks[bookIndex].words.push({ en, jp });
                saveData();
                updateAllUI();
                document.getElementById('searched-english-word').value = '';
                document.getElementById('searched-japanese-word').value = '';
            }
        });
    };

    // --- 学習セッションの関数群 ---
    const startLearning = (wordsToLearn, isReviewMode = false) => {
        if (!wordsToLearn || wordsToLearn.length === 0) {
            alert('学習する単語がありません。');
            return;
        }
        const mode = document.querySelector('input[name="learn-mode"]:checked').value;
        // 【修正】学習する単語をシャッフル
        const shuffledWords = [...wordsToLearn].sort(() => Math.random() - 0.5);
        currentLearningSession = { words: shuffledWords, currentIndex: 0, mode, unknownWords: [], stockWords: [], isReviewMode };
        learningPage.settings.classList.add('d-none');
        learningPage.learningArea.classList.remove('d-none');
        showNextWord();
    };

    const stopLearning = () => {
        learningPage.learningArea.classList.add('d-none');
        learningPage.settings.classList.remove('d-none');
        currentLearningSession = null;
    };

    const showNextWord = () => {
        if (!currentLearningSession) return;
        learningPage.flashcard.classList.remove('is-flipped');
        const session = currentLearningSession;
        if (session.currentIndex >= session.words.length) {
            finishLearning();
            return;
        }
        setTimeout(() => {
            const word = session.words[session.currentIndex];
            if (session.mode === 'en-to-jp') {
                learningPage.cardFrontText.textContent = word.en;
                learningPage.cardBack.textContent = word.jp;
                learningPage.pronunciationBtn.style.display = 'flex';
            } else {
                learningPage.cardFrontText.textContent = word.jp;
                learningPage.cardBack.textContent = word.en;
                learningPage.pronunciationBtn.style.display = 'none';
            }
            learningPage.progressText.textContent = `${session.currentIndex + 1} / ${session.words.length}`;
        }, 200);
    };

    const handleAnswer = (type) => {
        if (!currentLearningSession) return;
        const word = currentLearningSession.words[currentLearningSession.currentIndex];
        if (type === 'unknown') currentLearningSession.unknownWords.push(word);
        else if (type === 'stock') currentLearningSession.stockWords.push(word);
        currentLearningSession.currentIndex++;
        showNextWord();
    };

    const finishLearning = () => {
        const session = currentLearningSession;
        let message = `学習が完了しました！\n\n- わかった: ${session.words.length - session.unknownWords.length - session.stockWords.length}語\n- わかった(ストック): ${session.stockWords.length}語\n- わからない: ${session.unknownWords.length}語`;
        
        // 「わからない」単語を復習リストに追加（重複チェックあり）
        session.unknownWords.forEach(unknownWord => { 
            if (!reviewList.some(w => w.en === unknownWord.en && w.jp === unknownWord.jp)) {
                reviewList.push(unknownWord);
            }
        });

        if (session.isReviewMode) {
            // 復習モードの場合、「わかった」「わかった(ストック)」の単語を復習リストから削除
            const learnedWords = session.words.filter(w => !session.unknownWords.includes(w));
            reviewList = reviewList.filter(reviewWord => 
                !learnedWords.some(learned => learned.en === reviewWord.en && learned.jp === reviewWord.jp)
            );
        } else {
            // 通常モードの場合、「わかった！」単語を単語帳から削除
            const bookIndex = learningPage.wordbookSelect.value;
            if (bookIndex >= 0 && wordbooks[bookIndex]) {
                const knownWords = session.words.filter(w => !session.unknownWords.includes(w) && !session.stockWords.includes(w));
                wordbooks[bookIndex].words = wordbooks[bookIndex].words.filter(originalWord => 
                    !knownWords.some(known => known.en === originalWord.en && known.jp === originalWord.jp)
                );
            }
        }
        saveData();
        updateAllUI();
        stopLearning();
        alert(message);
    };

   // --- 初期化処理 ---
    const initialize = () => {
        loadData();
        setupEventListeners();
        updateAllUI();
        switchPage('learning-page');

        // 【追加】Service Workerの登録
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('Service Worker registered: ', registration);
                    })
                    .catch(registrationError => {
                        console.log('Service Worker registration failed: ', registrationError);
                    });
            });
        }
    };

    initialize();
});