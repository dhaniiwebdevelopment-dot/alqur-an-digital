/* =========================================================
   GLOBAL DATA
   ========================================================= */

const API_V2 = "https://equran.id/api/v2";
const API_V1 = "https://equran.id/api";

let surahs = [];
let currentSurah = null;

let userData = {
    name: "",
    favorites: [],
    read: [],
    bookmarks: [],
    quizCount: 0,
    bestScore: 0,
    fontSize: 34,
    darkMode: false
};

let quizState = {
    questions: [],
    current: 0,
    score: 0,
    answered: false
};


/* =========================================================
   LOGIN
   ========================================================= */

function login(){

    const input =
        document.getElementById("loginName");

    const name =
        input.value.trim();

    if(!name){

        showToast("Masukkan nama terlebih dahulu.");

        input.focus();

        return;
    }

    userData.name = name;

    saveData();

    startApplication();
}


function startApplication(){

    document.getElementById("loginScreen")
        .classList.add("hidden");

    document.getElementById("app")
        .classList.add("active");

    updateUserUI();

    loadSurahs();

    applySettings();

}


function logout(){

    document.getElementById("app")
        .classList.remove("active");

    document.getElementById("loginScreen")
        .classList.remove("hidden");

    document.getElementById("loginName")
        .value = "";

}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function saveData(){

    localStorage.setItem(
        "quranLearningData",
        JSON.stringify(userData)
    );

}


function loadData(){

    const data =
        localStorage.getItem("quranLearningData");

    if(data){

        try{

            userData =
                {
                    ...userData,
                    ...JSON.parse(data)
                };

        }catch(error){

            console.log(error);

        }

    }

}


loadData();


/* =========================================================
   USER UI
   ========================================================= */

function updateUserUI(){

    const name =
        userData.name || "Teman";

    document.getElementById("welcomeName")
        .textContent =
        "Assalamu'alaikum, " + name;

    document.getElementById("heroName")
        .textContent = name;

    document.getElementById("avatar")
        .textContent =
        name.charAt(0).toUpperCase();

    document.getElementById("settingsName")
        .value = name;

    updateStats();

}


function saveName(){

    const name =
        document.getElementById("settingsName")
            .value.trim();

    if(!name){

        showToast("Nama tidak boleh kosong.");

        return;
    }

    userData.name = name;

    saveData();

    updateUserUI();

    showToast("Nama berhasil disimpan.");

}


/* =========================================================
   API
   ========================================================= */

async function loadSurahs(){

    const grid =
        document.getElementById("surahGrid");

    grid.innerHTML =
        `<div class="empty">
             Menghubungkan ke data Al-Qur'an...
        </div>`;

    try{

        let response =
            await fetch(API_V2 + "/surat");

        if(!response.ok){

            response =
                await fetch(API_V1 + "/surat");

        }

        if(!response.ok){

            throw new Error("API gagal");

        }

        const json =
            await response.json();

        /*
         * API v2:
         * { code, message, data }
         *
         * API v1:
         * array langsung
         */

        if(Array.isArray(json)){

            surahs = json;

        }else if(Array.isArray(json.data)){

            surahs = json.data;

        }else{

            throw new Error("Format data tidak dikenali");

        }

        normalizeSurahs();

        renderSurahs(surahs);

        updateStats();

    }catch(error){

        console.error(error);

        grid.innerHTML = `
            <div class="empty">

                <h3>
                    ! Gagal memuat data
                </h3>

                <p style="margin:10px 0">
                    Pastikan perangkat terhubung
                    ke internet.
                </p>

                <button
                    class="btn"
                    onclick="loadSurahs()">
                     Coba Lagi
                </button>

            </div>
        `;

    }

}


/* =========================================================
   NORMALIZE SURAH
========================================================= */

function normalizeSurahs(){

    surahs =
        surahs.map((s,index)=>{

            return {

                nomor:
                    s.nomor ??
                    s.id ??
                    index + 1,

                nama:
                    s.nama ??
                    s.name ??
                    s.name_arabic ??
                    "",

                namaLatin:
                    s.namaLatin ??
                    s.name_latin ??
                    "",

                arti:
                    s.arti ??
                    s.name_translation ??
                    "",

                jumlahAyat:
                    s.jumlahAyat ??
                    s.number_of_ayahs ??
                    0,

                tempatTurun:
                    s.tempatTurun ??
                    s.revelation_place ??
                    "",

                audioFull:
                    s.audioFull ??
                    s.audio_url ??
                    ""

            };

        });

}


/* =========================================================
   RENDER SURAH
========================================================= */

function renderSurahs(list){

    const grid =
        document.getElementById("surahGrid");

    if(!list.length){

        grid.innerHTML =
            `<div class="empty">
                Surat tidak ditemukan.
            </div>`;

        return;

    }

    grid.innerHTML =
        list.map(s=>{

            const favorite =
                userData.favorites.includes(
                    Number(s.nomor)
                );

            return `

                <div
                    class="surah-card"
                    onclick="openSurah(${s.nomor})">

                    <button
                        class="favorite-small"
                        onclick="event.stopPropagation();toggleFavorite(${s.nomor})">

                        ${favorite ? "☆" : "☆"}

                    </button>

                    <div class="surah-number">
                        ${s.nomor}
                    </div>

                    <div
                        class="surah-arabic">
                        ${escapeHTML(s.nama)}
                    </div>

                    <h3>
                        ${escapeHTML(s.namaLatin)}
                    </h3>

                    <div class="surah-info">
                        ${escapeHTML(s.arti)}
                        •
                        ${s.jumlahAyat} ayat
                        •
                        ${escapeHTML(s.tempatTurun)}
                    </div>

                </div>

            `;

        }).join("");

}


/* =========================================================
   SEARCH
========================================================= */

function filterSurah(){

    const query =
        document.getElementById("searchSurah")
            .value
            .toLowerCase();

    const filter =
        document.getElementById("revelationFilter")
            .value;

    const result =
        surahs.filter(s=>{

            const matchesSearch =
                String(s.nomor)
                    .includes(query) ||
                s.namaLatin
                    .toLowerCase()
                    .includes(query) ||
                s.nama
                    .toLowerCase()
                    .includes(query) ||
                s.arti
                    .toLowerCase()
                    .includes(query);

            let matchesFilter = true;

            if(filter !== "all"){

                matchesFilter =
                    s.tempatTurun
                        .toLowerCase()
                        .includes(
                            filter.toLowerCase()
                        );

            }

            return matchesSearch &&
                   matchesFilter;

        });

    renderSurahs(result);

}


/* =========================================================
   OPEN SURAH
========================================================= */

async function openSurah(number){

    showPageByName("reader");

    const reader =
        document.getElementById("readerContent");

    reader.innerHTML =
        `<div class="empty">
             Memuat Surat...
        </div>`;

    try{

        let response =
            await fetch(
                `${API_V2}/surat/${number}`
            );

        if(!response.ok){

            response =
                await fetch(
                    `${API_V1}/surat/${number}`
                );

        }

        if(!response.ok){

            throw new Error("Gagal mengambil surat");

        }

        const json =
            await response.json();

        let data =
            json.data ?? json;

        currentSurah = data;

        normalizeCurrentSurah();

        renderReader();

        markRead(number);

    }catch(error){

        console.error(error);

        reader.innerHTML = `
            <div class="empty">

                <h3>
                     Surat gagal dimuat
                </h3>

                <button
                    class="btn"
                    onclick="openSurah(${number})"
                    style="margin-top:15px">

                     Coba Lagi

                </button>

            </div>
        `;

    }

}


/* =========================================================
   NORMALIZE CURRENT SURAH
========================================================= */

function normalizeCurrentSurah(){

    if(!currentSurah){

        return;

    }

    currentSurah.nomor =
        currentSurah.nomor ??
        currentSurah.id;

    currentSurah.nama =
        currentSurah.nama ??
        currentSurah.name ??
        currentSurah.name_arabic ??
        "";

    currentSurah.namaLatin =
        currentSurah.namaLatin ??
        currentSurah.name_latin ??
        "";

    currentSurah.arti =
        currentSurah.arti ??
        currentSurah.name_translation ??
        "";

    currentSurah.jumlahAyat =
        currentSurah.jumlahAyat ??
        currentSurah.number_of_ayahs ??
        0;

    currentSurah.tempatTurun =
        currentSurah.tempatTurun ??
        currentSurah.revelation_place ??
        "";

    currentSurah.ayat =
        currentSurah.ayat ??
        currentSurah.verses ??
        [];

}


/* =========================================================
   RENDER READER
========================================================= */

function renderReader(){

    const reader =
        document.getElementById("readerContent");

    const favorite =
        userData.favorites.includes(
            Number(currentSurah.nomor)
        );

    let html = `

        <div class="reader-header">

            <div class="reader-top">

                <div>

                    <h1>
                        ${escapeHTML(
                            currentSurah.namaLatin
                        )}
                    </h1>

                    <p>
                        ${escapeHTML(
                            currentSurah.arti
                        )}
                        •
                        ${currentSurah.jumlahAyat} ayat
                        •
                        ${escapeHTML(
                            currentSurah.tempatTurun
                        )}
                    </p>

                </div>

                <div
                    class="surah-arabic"
                    style="color:white">

                    ${escapeHTML(
                        currentSurah.nama
                    )}

                </div>

            </div>


            <div class="reader-controls">

                <button
                    class="btn gold"
                    onclick="toggleFavorite(${currentSurah.nomor})">

                    ${favorite ? "☆ Hapus Favorit" : "☆ Tambah Favorit"}

                </button>

                <button
                    class="btn light"
                    onclick="playFullAudio()">

                    Putar Audio

                </button>

                <button
                    class="btn secondary"
                    onclick="showTafsir()">

                    Tafsir

                </button>

            </div>

        </div>

    `;


    if(
        !currentSurah.ayat ||
        !currentSurah.ayat.length
    ){

        html += `
            <div class="empty">
                Data ayat belum tersedia.
            </div>
        `;

        reader.innerHTML = html;

        return;

    }


    html += currentSurah.ayat.map((a,index)=>{

        const nomorAyat =
            a.nomorAyat ??
            a.aya ??
            a.number ??
            index + 1;

        const arab =
            a.teksArab ??
            a.arab ??
            a.text ??
            "";

        const latin =
            a.teksLatin ??
            a.latin ??
            "";

        const translation =
            a.teksIndonesia ??
            a.terjemahan ??
            a.translation ??
            "";

        const audio =
            getAudioFromAyah(a);

        const bookmarked =
            userData.bookmarks.some(
                x =>
                    x.surah === Number(currentSurah.nomor) &&
                    x.ayah === Number(nomorAyat)
            );


        return `

            <article class="ayah-card">

                <div class="ayah-head">

                    <div class="ayah-number">
                        ${nomorAyat}
                    </div>

                </div>


                <div class="arabic">
                    ${escapeHTML(arab)}
                </div>


                ${
                    latin
                    ?
                    `<div class="latin">
                        ${escapeHTML(latin)}
                    </div>`
                    :
                    ""
                }


                <div class="translation">
                    ${escapeHTML(translation)}
                </div>

            </article>

        `;

    }).join("");


    html += `

        <div class="reader-footer">

            <button
                class="btn secondary"
                onclick="previousSurah()">

                ← Surat Sebelumnya

            </button>

            <button
                class="btn"
                onclick="nextSurah()">

                Surat Berikutnya →

            </button>

        </div>

    `;


    reader.innerHTML = html;

}


/* =========================================================
   AUDIO
========================================================= */

let audioPlayer = new Audio();

function getAudioFromAyah(a){

    if(!a){

        return "";

    }

    if(typeof a.audio === "string"){

        return a.audio;

    }

    if(a.audio){

        if(typeof a.audio === "object"){

            const values =
                Object.values(a.audio);

            if(values.length){

                return values[0];

            }

        }

    }

    return "";

}


function playAudio(url){

    if(!url){

        showToast(
            "Audio ayat tidak tersedia."
        );

        return;

    }

    audioPlayer.src = url;

    audioPlayer.play()
        .catch(()=>{
            showToast(
                "Audio tidak dapat diputar."
            );
        });

}


function playFullAudio(){

    let url =
        currentSurah?.audioFull;

    if(typeof url === "object"){

        const values =
            Object.values(url);

        url = values[0];

    }

    if(!url){

        showToast(
            "Audio surat tidak tersedia."
        );

        return;

    }

    playAudio(url);

}


/* =========================================================
   PREVIOUS / NEXT
========================================================= */

function previousSurah(){

    const n =
        Number(currentSurah.nomor);

    if(n <= 1){

        showToast("Ini adalah surat pertama.");

        return;

    }

    openSurah(n-1);

}


function nextSurah(){

    const n =
        Number(currentSurah.nomor);

    if(n >= 114){

        showToast("Ini adalah surat terakhir.");

        return;

    }

    openSurah(n+1);

}


/* =========================================================
   FAVORITE
========================================================= */

function toggleFavorite(number){

    number =
        Number(number);

    const index =
        userData.favorites.indexOf(number);

    if(index >= 0){

        userData.favorites.splice(index,1);

        showToast("Dihapus dari favorit.");

    }else{

        userData.favorites.push(number);

        showToast("Ditambahkan ke favorit.");

    }

    saveData();

    renderSurahs(surahs);

    renderFavorites();

    updateStats();

    if(currentSurah){

        renderReader();

    }

}


function renderFavorites(){

    const grid =
        document.getElementById("favoriteGrid");

    const list =
        surahs.filter(
            s =>
                userData.favorites.includes(
                    Number(s.nomor)
                )
        );

    if(!list.length){

        grid.innerHTML = `
            <div class="empty">
             Belum ada surat favorit
            </div>
        `;

        return;

    }

    grid.innerHTML =
        list.map(s=>{

            return `

                <div
                    class="surah-card"
                    onclick="openSurah(${s.nomor})">

                    <button
                        class="favorite-small"
                        onclick="event.stopPropagation();toggleFavorite(${s.nomor})">

                        

                    </button>

                    <div class="surah-number">
                        ${s.nomor}
                    </div>

                    <div class="surah-arabic">
                        ${escapeHTML(s.nama)}
                    </div>

                    <h3>
                        ${escapeHTML(s.namaLatin)}
                    </h3>

                    <div class="surah-info">
                        ${escapeHTML(s.arti)}
                        •
                        ${s.jumlahAyat} ayat
                    </div>

                </div>

            `;

        }).join("");

}


/* =========================================================
   BOOKMARK
========================================================= */

function toggleBookmark(surah,ayah){

    const index =
        userData.bookmarks.findIndex(
            x =>
                x.surah === Number(surah) &&
                x.ayah === Number(ayah)
        );

    if(index >= 0){

        userData.bookmarks.splice(index,1);

        showToast("Bookmark dihapus.");

    }else{

        userData.bookmarks.push({
            surah:Number(surah),
            ayah:Number(ayah)
        });

        showToast("Ayat disimpan.");

    }

    saveData();

    renderReader();

}


/* =========================================================
   MARK READ
========================================================= */

function markRead(number){

    number =
        Number(number);

    if(!userData.read.includes(number)){

        userData.read.push(number);

        saveData();

    }

    updateStats();

}


/* =========================================================
   RANDOM SURAH
========================================================= */

function openRandomSurah(){

    if(!surahs.length){

        showToast(
            "Data surat masih dimuat."
        );

        return;

    }

    const random =
        surahs[
            Math.floor(
                Math.random() *
                surahs.length
            )
        ];

    openSurah(random.nomor);

}


/* =========================================================
   QUIZ
========================================================= */

function startQuiz(){

    if(!surahs.length){

        showToast(
            "Data surat belum selesai dimuat."
        );

        return;

    }

    showPageByName("quiz");

    quizState = {
        questions:generateQuestions(10),
        current:0,
        score:0,
        answered:false
    };

    renderQuiz();

}


function generateQuestions(total){

    const questions = [];

    const shuffled =
        [...surahs]
            .sort(
                ()=>Math.random()-.5
            );

    for(
        let i=0;
        i<Math.min(total,shuffled.length);
        i++
    ){

        const correct =
            shuffled[i];

        const type =
            Math.floor(
                Math.random()*3
            );

        let question;
        let answer;
        let options;


        if(type === 0){

            question =
                `Apa nama surat nomor ${correct.nomor}?`;

            answer =
                correct.namaLatin;

            options =
                makeOptions(
                    correct,
                    "namaLatin"
                );

        }

        else if(type === 1){

            question =
                `Berapa jumlah ayat Surat ${correct.namaLatin}?`;

            answer =
                String(correct.jumlahAyat);

            options =
                makeNumberOptions(
                    correct.jumlahAyat
                );

        }

        else{

            question =
                `Surat ${correct.namaLatin} termasuk surat yang turun di mana?`;

            answer =
                correct.tempatTurun;

            options =
                makeOptions(
                    correct,
                    "tempatTurun"
                );

        }


        questions.push({
            question,
            answer,
            options
        });

    }

    return questions;

}


function makeOptions(correct,key){

    const values =
        surahs
            .filter(
                s =>
                    s.nomor !== correct.nomor
            )
            .sort(
                ()=>Math.random()-.5
            )
            .slice(0,3)
            .map(
                s =>
                    String(s[key])
            );

    values.push(
        String(correct[key])
    );

    return values.sort(
        ()=>Math.random()-.5
    );

}


function makeNumberOptions(correct){

    const set =
        new Set();

    set.add(
        String(correct)
    );

    while(set.size < 4){

        const n =
            Math.max(
                1,
                Number(correct) +
                Math.floor(
                    Math.random()*15
                ) -
                7
            );

        set.add(
            String(n)
        );

    }

    return [...set].sort(
        ()=>Math.random()-.5
    );

}


function renderQuiz(){

    const container =
        document.getElementById(
            "quizContainer"
        );

    if(
        quizState.current >=
        quizState.questions.length
    ){

        finishQuiz();

        return;

    }

    const q =
        quizState.questions[
            quizState.current
        ];

    const total =
        quizState.questions.length;

    const percent =
        (
            quizState.current /
            total
        )*100;


    container.innerHTML = `

        <div class="quiz-progress">

            <div
                class="progress-bar">

                <div
                    class="progress-fill"
                    style="width:${percent}%">
                </div>

            </div>

        </div>


        <div class="question-card">

            <div class="question-number">
                Soal ${quizState.current+1}
                dari ${total}
            </div>

            <h2>
                ${escapeHTML(q.question)}
            </h2>

            <div class="options">

                ${q.options.map(
                    option => `

                        <button
                            class="option"
                            onclick="answerQuiz(this,'${escapeAttribute(option)}')">

                            ${escapeHTML(option)}

                        </button>

                    `
                ).join("")}

            </div>

        </div>

    `;

}


function answerQuiz(button,answer){

    if(quizState.answered){

        return;

    }

    quizState.answered = true;

    const q =
        quizState.questions[
            quizState.current
        ];

    const buttons =
        document.querySelectorAll(
            ".option"
        );

    buttons.forEach(btn=>{

        if(
            btn.textContent.trim() ===
            q.answer.trim()
        ){

            btn.classList.add(
                "correct"
            );

        }

    });


    if(answer === q.answer){

        button.classList.add("correct");

        quizState.score++;

        showToast("Jawaban benar! ");

    }else{

        button.classList.add("wrong");

        showToast(
            "Jawaban belum tepat."
        );

    }


    setTimeout(()=>{

        quizState.current++;

        quizState.answered = false;

        renderQuiz();

    },900);

}


function finishQuiz(){

    const total =
        quizState.questions.length;

    const score =
        Math.round(
            (quizState.score / total) *
            100
        );

    userData.quizCount++;

    if(
        score >
        userData.bestScore
    ){

        userData.bestScore =
            score;

    }

    saveData();

    updateStats();


    document.getElementById(
        "quizContainer"
    ).innerHTML = `

        <div class="quiz-result">

            <div style="font-size:60px">
                ${
                    score >= 80
                    ? ""
                    : score >= 60
                    ? ""
                    : ""
                }
            </div>

            <h2>
                Kuis Selesai!
            </h2>

            <div class="score-big">
                ${score}
            </div>

            <p>
                Kamu menjawab
                <strong>
                    ${quizState.score}
                </strong>
                dari
                <strong>
                    ${total}
                </strong>
                soal dengan benar.
            </p>

            <button
                class="btn"
                style="margin-top:20px"
                onclick="startQuiz()">

                 Main Lagi

            </button>

        </div>

    `;

}


/* =========================================================
   TAFSIR
========================================================= */

async function showTafsir(){

    if(!currentSurah){

        return;

    }

    openModal(
        "Tafsir " +
        currentSurah.namaLatin,
        `<div class="empty">
             Memuat tafsir...
        </div>`
    );


    try{

        let response =
            await fetch(
                `${API_V2}/tafsir/${currentSurah.nomor}`
            );

        if(!response.ok){

            response =
                await fetch(
                    `${API_V1}/tafsir/${currentSurah.nomor}`
                );

        }

        if(!response.ok){

            throw new Error();

        }

        const json =
            await response.json();

        const data =
            json.data ?? json;

        let html = "";

        if(Array.isArray(data)){

            html =
                data.map((item,index)=>{

                    const text =
                        item.tafsir ??
                        item.teks ??
                        item.text ??
                        item.description ??
                        "";

                    return `

                        <div style="
                            padding:15px 0;
                            border-bottom:1px solid var(--border)
                        ">

                            <strong>
                                Ayat ${
                                    item.ayat ??
                                    item.aya ??
                                    index+1
                                }
                            </strong>

                            <p style="
                                margin-top:8px;
                                line-height:1.8
                            ">
                                ${escapeHTML(text)}
                            </p>

                        </div>

                    `;

                }).join("");

        }else{

            html = `
                <p style="line-height:1.8">
                    ${escapeHTML(
                        JSON.stringify(data)
                    )}
                </p>
            `;

        }


        document.getElementById(
            "modalBody"
        ).innerHTML = html;

    }catch(error){

        document.getElementById(
            "modalBody"
        ).innerHTML = `

            <div class="empty">

                Tafsir tidak dapat dimuat
                dari sumber API saat ini.

            </div>

        `;

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function showPage(pageId,button){

    document.querySelectorAll(
        ".page"
    ).forEach(page=>{

        page.classList.remove(
            "active"
        );

    });


    const page =
        document.getElementById(pageId);

    if(page){

        page.classList.add(
            "active"
        );

    }


    document.querySelectorAll(
        ".nav button"
    ).forEach(btn=>{

        btn.classList.remove(
            "active"
        );

    });


    if(button){

        button.classList.add(
            "active"
        );

    }


    if(pageId === "favorites"){

        renderFavorites();

    }


    if(pageId === "progress"){

        renderProgress();

    }


    document.getElementById(
        "sidebar"
    ).classList.remove("open");

}


function showPageByName(pageId){

    const button =
        [...document.querySelectorAll(
            ".nav button"
        )].find(
            btn =>
                btn.getAttribute(
                    "onclick"
                )?.includes(
                    `'${pageId}'`
                )
        );

    showPage(
        pageId,
        button
    );

}


/* =========================================================
   SIDEBAR
========================================================= */

function toggleSidebar(){

    document.getElementById(
        "sidebar"
    ).classList.toggle("open");

}


/* =========================================================
   STATS
========================================================= */

function updateStats(){

    const readCount =
        userData.read.length;

    const favCount =
        userData.favorites.length;

    const quizCount =
        userData.quizCount;

    const best =
        userData.bestScore;

    const progress =
        Math.round(
            (readCount / 114) *
            100
        );


    document.getElementById(
        "statSurah"
    ).textContent = readCount;

    document.getElementById(
        "statFavorite"
    ).textContent = favCount;

    document.getElementById(
        "statQuiz"
    ).textContent = quizCount;

    document.getElementById(
        "statScore"
    ).textContent = best;


    document.getElementById(
        "progressText"
    ).textContent =
        progress + "%";

    document.getElementById(
        "progressFill"
    ).style.width =
        progress + "%";


    document.getElementById(
        "progressSurah"
    ).textContent = readCount;

    document.getElementById(
        "progressFav"
    ).textContent = favCount;

    document.getElementById(
        "progressQuiz"
    ).textContent = quizCount;

    document.getElementById(
        "progressBest"
    ).textContent = best;

}


/* =========================================================
   PROGRESS
========================================================= */

function renderProgress(){

    updateStats();

    const progress =
        Math.round(
            (
                userData.read.length /
                114
            ) * 100
        );

    document.getElementById(
        "progressBig"
    ).textContent =
        progress + "%";

    document.getElementById(
        "progressBigFill"
    ).style.width =
        progress + "%";


    const description =
        document.getElementById(
            "progressDescription"
        );

    description.textContent =
        userData.read.length
        ? `Kamu sudah membaca ${userData.read.length} dari 114 surat. Terus semangat!`
        : "Belum ada surat yang selesai dibaca.";


    const list =
        document.getElementById(
            "readList"
        );


    const readSurahs =
        surahs.filter(
            s =>
                userData.read.includes(
                    Number(s.nomor)
                )
        );


    if(!readSurahs.length){

        list.innerHTML = `
            <div class="empty">
                Belum ada surat yang dibaca.
            </div>
        `;

        return;

    }


    list.innerHTML =
        readSurahs.map(s=>{

            return `

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    padding:13px 0;
                    border-bottom:1px solid var(--border)
                ">

                    <div>

                        <strong>
                            ${s.nomor}.
                            ${escapeHTML(
                                s.namaLatin
                            )}
                        </strong>

                        <div style="
                            color:var(--muted);
                            font-size:12px
                        ">
                            ${s.jumlahAyat} ayat
                        </div>

                    </div>

                    <button
                        class="btn"
                        onclick="openSurah(${s.nomor})">

                        Baca

                    </button>

                </div>

            `;

        }).join("");

}


/* =========================================================
   SETTINGS
========================================================= */

function toggleDarkMode(){

    userData.darkMode =
        !userData.darkMode;

    saveData();

    applySettings();

}


function changeFontSize(value){

    userData.fontSize =
        Number(value);

    document.getElementById(
        "fontValue"
    ).textContent =
        value + "px";

    document.documentElement
        .style.setProperty(
            "--quran-size",
            value + "px"
        );

    document.querySelectorAll(
        ".arabic"
    ).forEach(el=>{

        el.style.fontSize =
            value + "px";

    });

    saveData();

}


function applySettings(){

    if(userData.darkMode){

        document.body
            .classList.add("dark");

    }else{

        document.body
            .classList.remove("dark");

    }


    const range =
        document.getElementById(
            "fontRange"
        );

    if(range){

        range.value =
            userData.fontSize;

    }


    document.getElementById(
        "fontValue"
    ).textContent =
        userData.fontSize + "px";

}


/* =========================================================
   RESET
========================================================= */

function resetData(){

    const confirmReset =
        confirm(
            "Yakin ingin menghapus semua progress, favorit dan hasil kuis?"
        );

    if(!confirmReset){

        return;

    }

    userData = {

        name:userData.name,

        favorites:[],

        read:[],

        bookmarks:[],

        quizCount:0,

        bestScore:0,

        fontSize:34,

        darkMode:false

    };

    saveData();

    updateUserUI();

    applySettings();

    renderFavorites();

    showToast(
        "Data berhasil direset."
    );

}


/* =========================================================
   MODAL
========================================================= */

function openModal(title,body){

    document.getElementById(
        "modalTitle"
    ).textContent = title;

    document.getElementById(
        "modalBody"
    ).innerHTML = body;

    document.getElementById(
        "modal"
    ).classList.remove(
        "hidden"
    );

}


function closeModal(){

    document.getElementById(
        "modal"
    ).classList.add(
        "hidden"
    );

}


document.getElementById(
    "modal"
).addEventListener(
    "click",
    function(e){

        if(e.target === this){

            closeModal();

        }

    }
);


/* =========================================================
   TOAST
========================================================= */

let toastTimer;

function showToast(message){

    const toast =
        document.getElementById(
            "toast"
        );

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(()=>{

            toast.classList.remove(
                "show"
            );

        },2500);

}


/* =========================================================
   SECURITY / HTML ESCAPE
========================================================= */

function escapeHTML(value){

    if(value === undefined ||
       value === null){

        return "";

    }

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeAttribute(value){

    return String(value)
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        );

}


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    function(e){

        if(
            e.key === "Escape"
        ){

            closeModal();

        }

        if(
            e.key === "Enter" &&
            !document
                .getElementById(
                    "loginScreen"
                )
                .classList.contains(
                    "hidden"
                )
        ){

            login();

        }

    }
);


/* =========================================================
   STARTUP
========================================================= */

if(userData.name){

    startApplication();

}
