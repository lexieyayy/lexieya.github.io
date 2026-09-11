const SUPABASE_URL = "https://vokvtguinvrcignimxnz.supabase.co";
const SUPABASE_KEY = "sb_publishable_unLqx7_o_zlF0bTWtfOgZg_qqJ55uNb";

let supabaseClient = null;

window.allSets = [];
window.allActivities = [];
window.featuredSets = [];
window.isOwnerLoggedIn = false;

const subtitles = [
    "meow",
    "hai ;3",
    "lalala",
    "you stalk mee?",
    "me........",
    "haaallooooo ;3",
    "yayayaya",
    "nonono",
    ";3",
    "the silliest....",
    "haaiaiaiai",
    "i suck okay",
    "im so bad...",
    "kagura sucks at the game...",
    "i luv my friens...",
    "im evil",
    "im scary.. right..",
    "fukc tsb......",
    "i like making avatars a lot did you know that.. well now you know.. haha ;3",
    "yeah we did this",
    "professional keyboard masher",
    "hiiiiiiiii...."
];

document.addEventListener("DOMContentLoaded", () => {
    startApp();
});


/* =========================
   STARTUP
========================= */

async function startApp() {
    setupTypewriter();
    setupModals();
    setupFilters();
    setupSearch();
    setupAddSetForm();
    setupAddActivityForm();
    setupAddFeatForm();
    setupDateInput();
    setupDynamicActions();

    if (!window.supabase) {
        console.error("Supabase library failed to load.");
        showLoadingError("supabase failed to load");
        return;
    }

    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    setupAuth();

    await updateAuthUI();
    await loadSets();
    await loadActivities();
    await loadFeats();
}


/* =========================
   TYPEWRITER
========================= */

function setupTypewriter() {
    const element = document.getElementById("random-subtitle");

    if (!element) {
        return;
    }

    const isSetsPage = document.body.classList.contains("sets-page");

    const text = isSetsPage
        ? "every fight and every score"
        : subtitles[Math.floor(Math.random() * subtitles.length)];

    element.textContent = "";
    element.style.opacity = "1";
    element.classList.add("typing");

    let index = 0;

    function typeNextCharacter() {
        if (index >= text.length) {
            element.classList.remove("typing");
            element.classList.add("finished");
            return;
        }

        element.textContent += text[index];
        index++;

        setTimeout(typeNextCharacter, 38);
    }

    setTimeout(typeNextCharacter, 450);
}
/* =========================
   MODALS
========================= */

function setupModals() {
    const loginButtons = document.querySelectorAll(
        "#login-button, #home-login-button"
    );

    const addSetButton = document.getElementById("add-set-button");
    const addActivityButton = document.getElementById("add-activity-button");
    const addFeatButton = document.getElementById("add-feat-button");

    loginButtons.forEach((button) => {
        button.addEventListener("click", () => {
            openModal("login-modal");
        });
    });

    if (addSetButton) {
        addSetButton.addEventListener("click", () => {
            openModal("add-set-modal");
        });
    }

    if (addActivityButton) {
        addActivityButton.addEventListener("click", () => {
            openModal("add-activity-modal");
        });
    }

    if (addFeatButton) {
        addFeatButton.addEventListener("click", async () => {
            await populateFeatSelect();
            renderFeaturedManageList();
            openModal("add-feat-modal");
        });
    }

    document.querySelectorAll("[data-close-modal]").forEach((button) => {
        button.addEventListener("click", () => {
            const modal = button.closest(".modal-backdrop");

            if (modal) {
                closeModal(modal.id);
            }
        });
    });

    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
        backdrop.addEventListener("click", (event) => {
            if (event.target === backdrop) {
                closeModal(backdrop.id);
            }
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") {
            return;
        }

        document
            .querySelectorAll(".modal-backdrop.open")
            .forEach((modal) => {
                closeModal(modal.id);
            });
    });
}

function openModal(id) {
    const modal = document.getElementById(id);

    if (!modal) {
        console.error(`Modal not found: ${id}`);
        return;
    }

    modal.classList.add("open");
    document.body.classList.add("modal-open");
}

function closeModal(id) {
    const modal = document.getElementById(id);

    if (!modal) {
        return;
    }

    modal.classList.remove("open");

    if (!document.querySelector(".modal-backdrop.open")) {
        document.body.classList.remove("modal-open");
    }
}


/* =========================
   AUTH
========================= */

function setupAuth() {
    const loginForm = document.getElementById("login-form");

    const logoutButtons = document.querySelectorAll(
        "#logout-button, #home-logout-button"
    );

    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    logoutButtons.forEach((button) => {
        button.addEventListener("click", handleLogout);
    });

    supabaseClient.auth.onAuthStateChange(() => {
        setTimeout(async () => {
            await updateAuthUI();
            await loadSets();
            await loadActivities();
            await loadFeats();
        }, 0);
    });
}

async function updateAuthUI() {
    if (!supabaseClient) {
        return;
    }

    const loginButtons = document.querySelectorAll(
        "#login-button, #home-login-button"
    );

    const ownerTools = document.querySelectorAll(
        "#owner-tools, .home-owner-tools"
    );

    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Could not get session:", error);
        return;
    }

    window.isOwnerLoggedIn = Boolean(session);

    if (session) {
        loginButtons.forEach((button) => {
            button.style.display = "none";
        });

        ownerTools.forEach((element) => {
            element.style.display = "flex";
        });
    } else {
        loginButtons.forEach((button) => {
            button.style.display = "inline-flex";
        });

        ownerTools.forEach((element) => {
            element.style.display = "none";
        });
    }

    renderActivities();
    renderFeaturedManageList();
}

async function handleLogin(event) {
    event.preventDefault();

    if (!supabaseClient) {
        return;
    }

    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    const errorElement = document.getElementById("login-error");
    const submitButton = event.submitter;

    if (!emailInput || !passwordInput) {
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (errorElement) {
        errorElement.textContent = "";
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "signing in...";
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error("Login failed:", error);

        if (errorElement) {
            errorElement.textContent = error.message;
        }

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "sign in";
        }

        return;
    }

    document.getElementById("login-form")?.reset();

    closeModal("login-modal");

    if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "sign in";
    }
}

async function handleLogout() {
    if (!supabaseClient) {
        return;
    }

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Logout failed:", error);
        return;
    }

    await updateAuthUI();
    await loadSets();
    await loadActivities();
    await loadFeats();
}
/* =========================
   LOAD SETS
========================= */

async function loadSets() {
    if (!supabaseClient) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("sets")
        .select("*")
        .order("played_at", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Could not load sets:", error);
        showLoadingError("couldn't load the archive");
        return;
    }

    window.allSets = data || [];

    updateStats(window.allSets);
    updateFilterCounts(window.allSets);

    renderSets();
    populateFeatSelect();
}


/* =========================
   RENDER SETS
========================= */

function renderSets() {
    const list = document.getElementById("sets-list");

    if (!list) {
        return;
    }

    const searchInput = document.querySelector(".search-wrapper input");

    const searchTerm = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const activeFilter =
        document.querySelector(".filter.active")?.dataset.filter || "all";

    const allSets = window.allSets || [];

    let filtered = allSets;

    if (activeFilter !== "all") {
        filtered = filtered.filter(
            (set) => set.result === activeFilter
        );
    }

    if (searchTerm) {
        filtered = filtered.filter((set) => {
            return [
                set.opponent,
                set.result,
                set.format,
                set.character,
                set.played_at
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLowerCase().includes(searchTerm)
                );
        });
    }

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">—</div>
                <h3>${allSets.length ? "nothing found" : "no sets yet"}</h3>
                <p>${
                    allSets.length
                        ? "try another search or filter..."
                        : "the archive is empty for now..."
                }</p>
            </div>
        `;

        updateSetCount(0);
        return;
    }

    list.innerHTML = filtered
        .map((set) => createSetCard(set))
        .join("");

    updateSetCount(filtered.length);
}

function createSetCard(set) {
    const opponent = escapeHtml(set.opponent || "unknown");
    const result = escapeHtml(set.result || "");
    const format = escapeHtml(set.format || "—");
    const character = escapeHtml(set.character || "—");

    const playerScore = Number.isFinite(Number(set.player_score))
        ? Number(set.player_score)
        : 0;

    const opponentScore = Number.isFinite(Number(set.opponent_score))
        ? Number(set.opponent_score)
        : 0;

    const playedAt = set.played_at
        ? formatDate(set.played_at)
        : "—";

    const resultLabel =
        result === "win"
            ? "win"
            : "loss";

    return `
        <article class="set-card">

            <div class="set-card-top">

                <div class="set-opponent">
                    <span>vs</span>
                    <strong>${opponent}</strong>
                </div>

                <div class="set-result ${resultLabel}">
                    ${resultLabel}
                </div>

            </div>


            <div class="set-score">
                ${playerScore}
                <span>—</span>
                ${opponentScore}
            </div>


            <div class="set-card-details">

                <div class="set-detail">
                    <span>format</span>
                    <strong>${format}</strong>
                </div>

                <div class="set-detail">
                    <span>character</span>
                    <strong>${character}</strong>
                </div>

                <div class="set-detail">
                    <span>date</span>
                    <strong>${playedAt}</strong>
                </div>

            </div>

        </article>
    `;
}


/* =========================
   FILTERS
========================= */

function setupFilters() {
    document.querySelectorAll(".filter").forEach((button) => {
        button.addEventListener("click", () => {

            document
                .querySelectorAll(".filter")
                .forEach((filter) => {
                    filter.classList.remove("active");
                });

            button.classList.add("active");

            renderSets();
        });
    });
}

function updateFilterCounts(sets) {
    const allButton = document.querySelector(
        '.filter[data-filter="all"] span'
    );

    const winButton = document.querySelector(
        '.filter[data-filter="win"] span'
    );

    const lossButton = document.querySelector(
        '.filter[data-filter="loss"] span'
    );

    if (allButton) {
        allButton.textContent = sets.length;
    }

    if (winButton) {
        winButton.textContent = sets.filter(
            (set) => set.result === "win"
        ).length;
    }

    if (lossButton) {
        lossButton.textContent = sets.filter(
            (set) => set.result === "loss"
        ).length;
    }
}


/* =========================
   SEARCH
========================= */

function setupSearch() {
    const input = document.querySelector(".search-wrapper input");

    if (!input) {
        return;
    }

    input.addEventListener("input", () => {
        renderSets();
    });
}


/* =========================
   ADD SET
========================= */

function setupAddSetForm() {
    const form = document.getElementById("add-set-form");

    if (!form) {
        return;
    }

    form.addEventListener("submit", handleAddSet);
}

async function handleAddSet(event) {
    event.preventDefault();

    if (!supabaseClient) {
        return;
    }

    const errorElement = document.getElementById("add-set-error");
    const submitButton = event.submitter;

    const opponent = document
        .getElementById("set-opponent")
        ?.value.trim();

    const result = document
        .getElementById("set-result")
        ?.value;

    const format = document
        .getElementById("set-format")
        ?.value.trim();

    const playerScore = Number(
        document.getElementById("set-player-score")?.value
    );

    const opponentScore = Number(
        document.getElementById("set-opponent-score")?.value
    );

    const character = document
        .getElementById("set-character")
        ?.value.trim();

    const playedAt = document
        .getElementById("set-date")
        ?.value;

    if (errorElement) {
        errorElement.textContent = "";
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "saving...";
    }

    const { error } = await supabaseClient
        .from("sets")
        .insert({
            opponent,
            result,
            player_score: playerScore,
            opponent_score: opponentScore,
            format,
            character,
            played_at: playedAt
        });

    if (error) {
        console.error("Could not add set:", error);

        if (errorElement) {
            errorElement.textContent = error.message;
        }

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "save set";
        }

        return;
    }

    document
        .getElementById("add-set-form")
        ?.reset();

    setupDateInput();

    closeModal("add-set-modal");

    if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "save set";
    }

    await loadSets();
}


/* =========================
   HOME STATS
========================= */

function updateStats(sets) {
    const setsElement = document.getElementById("stat-sets");
    const wlElement = document.getElementById("stat-record");
    const winrateElement = document.getElementById("stat-winrate");
    const roundsElement = document.getElementById("stat-rounds");

    const wins = sets.filter(
        (set) => set.result === "win"
    ).length;

    const losses = sets.filter(
        (set) => set.result === "loss"
    ).length;

    let winLossRatio;

    if (losses === 0) {
        winLossRatio =
            wins > 0
                ? wins.toFixed(2)
                : "0.00";
    } else {
        winLossRatio =
            (wins / losses).toFixed(2);
    }

    if (setsElement) {
        const target = sets.length;

        if (target === 0) {
            setsElement.textContent = "0";
        } else {
            let current = 0;

            const delay = Math.max(
                25,
                Math.min(
                    180,
                    Math.round(420 / target)
                )
            );

            function countUp() {
                current++;

                setsElement.textContent =
                    current;

                if (current < target) {
                    setTimeout(
                        countUp,
                        delay
                    );
                }
            }

            countUp();
        }
    }

    if (wlElement) {
        wlElement.textContent =
            winLossRatio;
    }

    if (winrateElement) {
        winrateElement.textContent =
            sets.length > 0
                ? `${Math.round(
                    (wins / sets.length) * 100
                  )}%`
                : "—";
    }

    if (roundsElement) {
        roundsElement.textContent =
            `${wins} - ${losses}`;
    }
        }
/* =========================
   RECENT ACTIVITIES
========================= */

function setupAddActivityForm() {
    const form = document.getElementById("add-activity-form");

    if (!form) {
        return;
    }

    form.addEventListener("submit", handleAddActivity);
}

async function handleAddActivity(event) {
    event.preventDefault();

    if (!supabaseClient) {
        return;
    }

    const input = document.getElementById("activity-content");
    const errorElement = document.getElementById("activity-error");
    const submitButton = event.submitter;

    const content = input?.value.trim();

    if (!content) {
        return;
    }

    if (errorElement) {
        errorElement.textContent = "";
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "posting...";
    }

    const { error } = await supabaseClient
        .from("activities")
        .insert({
            content
        });

    if (error) {
        console.error("Could not add activity:", error);

        if (errorElement) {
            errorElement.textContent = error.message;
        }

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "post activity";
        }

        return;
    }

    document
        .getElementById("add-activity-form")
        ?.reset();

    closeModal("add-activity-modal");

    if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "post activity";
    }

    await loadActivities();
}

async function loadActivities() {
    const list = document.getElementById("recent-activities");

    if (!list || !supabaseClient) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("activities")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(
            "Could not load activities:",
            error
        );

        window.allActivities = [];
        renderActivities();

        return;
    }

    window.allActivities = data || [];

    renderActivities();
}

function renderActivities() {
    const list =
        document.getElementById(
            "recent-activities"
        );

    if (!list) {
        return;
    }

    const activities =
        window.allActivities || [];

    if (activities.length === 0) {
        list.innerHTML = `
            <div class="empty">
                nothing here yet...
            </div>
        `;

        return;
    }

    list.innerHTML = activities
        .map((activity) =>
            createActivity(activity)
        )
        .join("");
}

function createActivity(activity) {
    const content =
        escapeHtml(
            activity.content || ""
        );

    const date =
        activity.created_at
            ? formatActivityDate(
                activity.created_at
            )
            : "";

    const deleteButton =
        window.isOwnerLoggedIn
            ? `
                <button
                    class="activity-delete"
                    data-delete-activity="${activity.id}"
                    type="button"
                >
                    ×
                </button>
            `
            : "";

    return `
        <article class="activity">

            <div class="activity-content">
                ${content}
            </div>

            <div class="activity-meta">
                <span>${date}</span>
                ${deleteButton}
            </div>

        </article>
    `;
}


/* =========================
   FEATURED SETS
========================= */

function setupAddFeatForm() {
    const form =
        document.getElementById(
            "add-feat-form"
        );

    if (!form) {
        return;
    }

    form.addEventListener(
        "submit",
        handleAddFeat
    );
}

async function loadFeats() {
    const list =
        document.getElementById(
            "feats-list"
        );

    if (!list || !supabaseClient) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("featured_sets")
            .select(`
                id,
                set_id,
                created_at,
                sets (
                    id,
                    opponent,
                    result,
                    player_score,
                    opponent_score,
                    format,
                    character,
                    played_at
                )
            `)
            .order("created_at", {
                ascending: false
            });

    if (error) {
        console.error(
            "Could not load featured sets:",
            error
        );

        window.featuredSets = [];
        renderFeats();

        return;
    }

    window.featuredSets = data || [];

    renderFeats();
    renderFeaturedManageList();
}

function renderFeats() {
    const list =
        document.getElementById(
            "feats-list"
        );

    if (!list) {
        return;
    }

    const featured =
        window.featuredSets || [];

    if (featured.length === 0) {
        list.innerHTML = `
            <div class="empty">
                no feats here yet...
            </div>
        `;

        return;
    }

    list.innerHTML = featured
        .map((featuredSet) => {
            const set =
                featuredSet.sets;

            if (!set) {
                return "";
            }

            return createFeaturedCard(
                set
            );
        })
        .join("");
}

function createFeaturedCard(set) {
    const opponent =
        escapeHtml(
            set.opponent || "unknown"
        );

    const result =
        set.result === "win"
            ? "win"
            : "loss";

    const format =
        escapeHtml(
            set.format || "—"
        );

    const character =
        escapeHtml(
            set.character || "—"
        );

    const playerScore =
        Number.isFinite(
            Number(set.player_score)
        )
            ? Number(set.player_score)
            : 0;

    const opponentScore =
        Number.isFinite(
            Number(set.opponent_score)
        )
            ? Number(set.opponent_score)
            : 0;

    const playedAt =
        set.played_at
            ? formatDate(
                set.played_at
            )
            : "—";

    return `
        <article class="featured-set">

            <div class="featured-top">

                <span class="eyebrow">
                    feat
                </span>

                <span class="set-result ${result}">
                    ${result}
                </span>

            </div>

            <div class="featured-opponent">
                vs ${opponent}
            </div>

            <div class="featured-score">
                ${playerScore}
                <span>—</span>
                ${opponentScore}
            </div>

            <div class="featured-details">

                <span>
                    ${format}
                </span>

                <span>
                    ${character}
                </span>

                <span>
                    ${playedAt}
                </span>

            </div>

        </article>
    `;
                    }
/* =========================
   FEATURE MANAGEMENT
========================= */

async function populateFeatSelect() {
    const select = document.getElementById("feat-set-select");

    if (!select) {
        return;
    }

    const sets = window.allSets || [];
    const featuredIds = new Set(
        (window.featuredSets || []).map(
            (featured) => String(featured.set_id)
        )
    );

    const availableSets = sets.filter(
        (set) => !featuredIds.has(String(set.id))
    );

    if (availableSets.length === 0) {
        select.innerHTML = `
            <option value="">
                no sets available
            </option>
        `;

        select.disabled = true;
        return;
    }

    select.disabled = false;

    select.innerHTML = `
        <option value="" selected disabled>
            choose a set...
        </option>

        ${availableSets.map((set) => {
            const opponent = escapeHtml(
                set.opponent || "unknown"
            );

            const result =
                set.result === "win" ? "W" : "L";

            const playerScore =
                Number(set.player_score) || 0;

            const opponentScore =
                Number(set.opponent_score) || 0;

            const date = set.played_at
                ? formatDate(set.played_at)
                : "—";

            return `
                <option value="${escapeHtml(String(set.id))}">
                    ${result} vs ${opponent} · ${playerScore}-${opponentScore} · ${date}
                </option>
            `;
        }).join("")}
    `;
}

async function handleAddFeat(event) {
    event.preventDefault();

    if (!supabaseClient) {
        return;
    }

    const select =
        document.getElementById(
            "feat-set-select"
        );

    const errorElement =
        document.getElementById(
            "feat-error"
        );

    const submitButton =
        event.submitter;

    const setId =
        select?.value;

    if (!setId) {
        if (errorElement) {
            errorElement.textContent =
                "choose a set first";
        }

        return;
    }

    if (errorElement) {
        errorElement.textContent = "";
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent =
            "adding...";
    }

    const { error } =
        await supabaseClient
            .from("featured_sets")
            .insert({
                set_id: Number(setId)
            });

    if (error) {
        console.error(
            "Could not feature set:",
            error
        );

        if (errorElement) {
            errorElement.textContent =
                error.message;
        }

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent =
                "add feat";
        }

        return;
    }

    if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent =
            "add feat";
    }

    await loadFeats();
    await populateFeatSelect();

    if (select) {
        select.value = "";
    }
}

function renderFeaturedManageList() {
    const list =
        document.getElementById(
            "featured-manage-list"
        );

    if (!list) {
        return;
    }

    if (!window.isOwnerLoggedIn) {
        list.innerHTML = "";
        return;
    }

    const featured =
        window.featuredSets || [];

    if (featured.length === 0) {
        list.innerHTML = `
            <div class="empty">
                no featured sets yet...
            </div>
        `;

        return;
    }

    list.innerHTML = featured
        .map((featuredSet) => {
            const set =
                featuredSet.sets;

            if (!set) {
                return "";
            }

            const opponent =
                escapeHtml(
                    set.opponent ||
                        "unknown"
                );

            const result =
                set.result === "win"
                    ? "win"
                    : "loss";

            const score =
                `${Number(
                    set.player_score
                ) || 0}-${Number(
                    set.opponent_score
                ) || 0}`;

            return `
                <div class="featured-manage-item">

                    <div>
                        <strong>
                            vs ${opponent}
                        </strong>

                        <span>
                            ${result} · ${score}
                        </span>
                    </div>

                    <button
                        type="button"
                        class="activity-delete"
                        data-delete-featured="${featuredSet.id}"
                    >
                        ×
                    </button>

                </div>
            `;
        })
        .join("");
}


/* =========================
   DYNAMIC ACTIONS
========================= */

function setupDynamicActions() {
    document.addEventListener(
        "click",
        async (event) => {
            const activityButton =
                event.target.closest(
                    "[data-delete-activity]"
                );

            if (activityButton) {
                const id =
                    activityButton.dataset
                        .deleteActivity;

                await deleteActivity(id);
                return;
            }

            const featuredButton =
                event.target.closest(
                    "[data-delete-featured]"
                );

            if (featuredButton) {
                const id =
                    featuredButton.dataset
                        .deleteFeatured;

                await deleteFeatured(id);
                return;
            }
        }
    );
}

async function deleteActivity(id) {
    if (
        !supabaseClient ||
        !window.isOwnerLoggedIn
    ) {
        return;
    }

    const { error } =
        await supabaseClient
            .from("activities")
            .delete()
            .eq("id", id);

    if (error) {
        console.error(
            "Could not delete activity:",
            error
        );

        return;
    }

    await loadActivities();
}

async function deleteFeatured(id) {
    if (
        !supabaseClient ||
        !window.isOwnerLoggedIn
    ) {
        return;
    }

    const { error } =
        await supabaseClient
            .from("featured_sets")
            .delete()
            .eq("id", id);

    if (error) {
        console.error(
            "Could not remove featured set:",
            error
        );

        return;
    }

    await loadFeats();
    await populateFeatSelect();
             }
/* =========================
   DATE HELPERS
========================= */

function setupDateInput() {
    const input =
        document.getElementById("set-date");

    if (!input) {
        return;
    }

    if (!input.value) {
        const today =
            new Date()
                .toISOString()
                .split("T")[0];

        input.value = today;
    }
}

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(`${value}T00:00:00`);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return escapeHtml(
            String(value)
        );
    }

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

function formatActivityDate(value) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


/* =========================
   SET COUNT
========================= */

function updateSetCount(count) {
    const element =
        document.querySelector(
            ".set-count span"
        );

    if (!element) {
        return;
    }

    element.textContent =
        `${count} ${
            count === 1
                ? "set"
                : "sets"
        }`;
}


/* =========================
   LOADING ERROR
========================= */

function showLoadingError(message) {
    const list =
        document.getElementById(
            "sets-list"
        );

    if (!list) {
        return;
    }

    list.innerHTML = `
        <div class="empty-state">

            <div class="empty-icon">
                !
            </div>

            <h3>
                ${escapeHtml(message)}
            </h3>

            <p>
                check the console for details...
            </p>

        </div>
    `;
}


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
