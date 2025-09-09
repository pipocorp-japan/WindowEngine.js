(function(global) {
    'use strict';

    const WindowEngine = {
        windows: {}, // 作成したウィンドウ要素を管理するオブジェクト
        zIndexCounter: 1000, // ウィンドウの重なり順を管理するカウンター

        /**
         * ライブラリの初期化（基本的なCSSをドキュメントに挿入）
         */
        _init: function() {
            if (document.getElementById('window-engine-styles')) return;
            const style = document.createElement('style');
            style.id = 'window-engine-styles';
            style.innerHTML = `
                .window-engine-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    z-index: 999;
                }
                .window-engine-window {
                    position: fixed;
                    background-color: #fff;
                    border: 1px solid #ccc;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    border-radius: 5px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .window-engine-titlebar {
                    background-color: #f1f1f1;
                    padding: 8px;
                    cursor: move;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    user-select: none;
                }
                .window-engine-title {
                    font-weight: bold;
                    color: #333;
                }
                .window-engine-controls button {
                    border: none;
                    background: none;
                    width: 20px;
                    height: 20px;
                    margin-left: 5px;
                    cursor: pointer;
                    font-weight: bold;
                    line-height: 20px;
                    text-align: center;
                }
                .window-engine-controls button:hover {
                    background-color: #e0e0e0;
                }
                .window-engine-close-btn:hover {
                    background-color: #e81123;
                    color: white;
                }
                .window-engine-content {
                    padding: 15px;
                    flex-grow: 1;
                    overflow: auto;
                }
            `;
            document.head.appendChild(style);
        },

        /**
         * 新しいウィンドウを作成する
         * @param {string} style - CSS文字列
         * @param {number} Hsize - ウィンドウの高さ(px)
         * @param {number} Wsize - ウィンドウの幅(px)
         * @param {number} mode - ウィンドウのモード (1-6)
         * @param {string} content - HTMLコンテンツ
         * @param {number} id - 管理用ID
         */
        create: function(style, Hsize, Wsize, mode, content, id) {
            if (this.windows[id]) {
                console.error(`Error: Window with id ${id} already exists.`);
                return;
            }

            this._init();

            const isModal = mode >= 4;
            let overlay = null;

            // モーダルウィンドウの場合、オーバーレイを作成
            if (isModal) {
                overlay = document.createElement('div');
                overlay.className = 'window-engine-overlay';
                overlay.style.zIndex = this.zIndexCounter++;
                document.body.appendChild(overlay);
            }

            // ウィンドウ本体
            const win = document.createElement('div');
            win.id = `window-engine-${id}`;
            win.className = 'window-engine-window';
            win.style.width = `${Wsize}px`;
            win.style.height = `${Hsize}px`;
            win.style.left = `${(window.innerWidth - Wsize) / 2}px`;
            win.style.top = `${(window.innerHeight - Hsize) / 2}px`;
            win.style.zIndex = this.zIndexCounter++;
            if (style) {
                win.style.cssText += style;
            }
            
            // HTMLコンテンツからタイトルを抽出
            const titleMatch = content.match(/<title>(.*?)<\/title>/i);
            const titleText = titleMatch ? titleMatch[1] : 'Window';
            const cleanContent = titleMatch ? content.replace(titleMatch[0], '') : content;

            // タイトルバー
            const titleBar = document.createElement('div');
            titleBar.className = 'window-engine-titlebar';

            const titleElem = document.createElement('span');
            titleElem.className = 'window-engine-title';
            titleElem.textContent = titleText;

            // コントロールボタン
            const controls = document.createElement('div');
            controls.className = 'window-engine-controls';
            
            if (mode === 2 || mode === 3 || mode === 5 || mode === 6) {
                const minimizeBtn = document.createElement('button');
                minimizeBtn.innerHTML = '&#8210;'; // -
                minimizeBtn.title = 'Minimize';
                controls.appendChild(minimizeBtn);
                // Note: 最小化の具体的な動作は未実装
            }
            if (mode === 3 || mode === 6) {
                const maximizeBtn = document.createElement('button');
                maximizeBtn.innerHTML = '&#9633;'; // □
                maximizeBtn.title = 'Maximize';
                controls.appendChild(maximizeBtn);
                // Note: 最大化の具体的な動作は未実装
            }
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&#10005;'; // ×
            closeBtn.className = 'window-engine-close-btn';
            closeBtn.title = 'Close';
            closeBtn.onclick = () => this.close(id);
            controls.appendChild(closeBtn);

            titleBar.appendChild(titleElem);
            titleBar.appendChild(controls);

            // コンテンツエリア
            const contentArea = document.createElement('div');
            contentArea.className = 'window-engine-content';
            contentArea.innerHTML = cleanContent;

            win.appendChild(titleBar);
            win.appendChild(contentArea);
            document.body.appendChild(win);

            // 作成したウィンドウ情報を保存
            this.windows[id] = {
                element: win,
                overlay: overlay
            };

            // ドラッグ移動機能
            this._makeDraggable(win, titleBar);

            // ウィンドウをクリックしたときに最前面に表示
            win.addEventListener('mousedown', () => {
                win.style.zIndex = this.zIndexCounter++;
            });
        },

        /**
         * ウィンドウを閉じる
         * @param {number} id - 閉じるウィンドウの管理用ID
         */
        close: function(id) {
            const winData = this.windows[id];
            if (!winData) return;

            if (winData.element) {
                winData.element.parentNode.removeChild(winData.element);
            }
            if (winData.overlay) {
                winData.overlay.parentNode.removeChild(winData.overlay);
            }

            delete this.windows[id];
        },

        /**
         * ウィンドウを更新する
         * @param {string} style - CSS文字列
         * @param {number} Hsize - ウィンドウの高さ(px)
         * @param {number} Wsize - ウィンドウの幅(px)
         * @param {number} mode - ウィンドウのモード (1-6)
         * @param {string} content - HTMLコンテンツ
         * @param {number} id - 管理用ID
         */
        modyfy: function(style, Hsize, Wsize, mode, content, id) {
            if (!this.windows[id]) {
                console.error(`Error: Window with id ${id} does not exist.`);
                return;
            }
            // 既存のウィンドウを閉じてから、新しい設定で再作成する
            this.close(id);
            this.create(style, Hsize, Wsize, mode, content, id);
        },
        
        /**
         * ウィンドウをドラッグ可能にする
         * @param {HTMLElement} winElem - ウィンドウ要素
         * @param {HTMLElement} handleElem - ドラッグのハンドルとなる要素 (タイトルバー)
         */
        _makeDraggable: function(winElem, handleElem) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

            handleElem.onmousedown = function(e) {
                e.preventDefault();
                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            };

            function elementDrag(e) {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                winElem.style.top = (winElem.offsetTop - pos2) + "px";
                winElem.style.left = (winElem.offsetLeft - pos1) + "px";
            }

            function closeDragElement() {
                document.onmouseup = null;
                document.onmousemove = null;
            }
        }
    };

    // グローバルオブジェクト (window) に WindowEngine を公開する
    global.WindowEngine = WindowEngine;

})(window);
