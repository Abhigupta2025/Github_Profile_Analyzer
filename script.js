/***************************************
 * GitHub Profile Analyzer - FINAL JS
 ***************************************/

//  GitHub Token (LOCAL USE ONLY)
const TOKEN = window.GITHUB_TOKEN || "";

/* ---------- VIEW ELEMENTS ---------- */
const homeView = document.getElementById("homeView");
const analyzeView = document.getElementById("analyzeView");
const compareView = document.getElementById("compareView");

const goAnalyze = document.getElementById("goAnalyze");
const goCompare = document.getElementById("goCompare");
const backButtons = document.querySelectorAll(".backBtn");

/* ---------- ANALYZE DOM ---------- */
const searchBtn = document.getElementById("searchBtn");
const profileDiv = document.getElementById("profile");
const reposDiv = document.getElementById("repos");
const repoList = document.getElementById("repoList");
const chartCard = document.getElementById("chartCard");
const profileSkeleton = document.getElementById("profileSkeleton");

const sortSelect = document.getElementById("sortRepos");
const languageSelect = document.getElementById("filterLanguage");

const searchHistoryDiv = document.getElementById("searchHistory");
const historyList = document.getElementById("historyList");

/* ---------- THEME ---------- */
const themeToggle = document.getElementById("themeToggle");

/* ---------- COMPARE DOM ---------- */
const compareBtn = document.getElementById("compareBtn");
const compareUser1 = document.getElementById("compareUser1");
const compareUser2 = document.getElementById("compareUser2");

/* ---------- STATE ---------- */
let allRepos = [];
let languageChart = null;
let compareChart1 = null;
let compareChart2 = null;

/* ======================================================
   VIEW SWITCHING
====================================================== */
function showView(view) {
  homeView.classList.add("hidden");
  analyzeView.classList.add("hidden");
  compareView.classList.add("hidden");
  view.classList.remove("hidden");
}

goAnalyze.addEventListener("click", () => showView(analyzeView));
goCompare.addEventListener("click", () => showView(compareView));

backButtons.forEach(btn =>
  btn.addEventListener("click", () => showView(homeView))
);

/* ======================================================
   THEME TOGGLE
====================================================== */
function applyTheme(theme) {
  if (theme === "light") {
    document.body.classList.add("light");
    themeToggle.textContent = "☀️";
  } else {
    document.body.classList.remove("light");
    themeToggle.textContent = "🌙";
  }
}

themeToggle.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light");
  const theme = isLight ? "light" : "dark";
  localStorage.setItem("theme", theme);
  applyTheme(theme);
});

applyTheme(localStorage.getItem("theme") || "dark");

/* ======================================================
   ANALYZE PROFILE (UNCHANGED)
====================================================== */
searchBtn.addEventListener("click", handleSearch);
sortSelect.addEventListener("change", applyRepoFilters);
languageSelect.addEventListener("change", applyRepoFilters);

function handleSearch() {
  const username = document.getElementById("username").value.trim();

  repoList.innerHTML = "";
  reposDiv.classList.add("hidden");
  chartCard.classList.add("hidden");

  if (languageChart) {
    languageChart.destroy();
    languageChart = null;
  }

  sortSelect.value = "";
  languageSelect.innerHTML = '<option value="">All Languages</option>';

  if (!username) {
    profileDiv.classList.remove("hidden");
    profileDiv.innerHTML = "<p>Please enter a GitHub username</p>";
    return;
  }

  profileSkeleton.classList.remove("hidden");
  profileDiv.classList.add("hidden");

  fetchGitHubProfile(username);
}

function fetchGitHubProfile(username) {
  fetch(`https://api.github.com/users/${username}`, {
    headers: { Authorization: `token ${TOKEN}` }
  })
    .then(res => {
      if (!res.ok) throw new Error("User not found");
      return res.json();
    })
    .then(user => {
      showProfile(user);
      saveToHistory(username);
      fetchRepos(username);
    })
    .catch(err => {
      profileSkeleton.classList.add("hidden");
      profileDiv.classList.remove("hidden");
      profileDiv.innerHTML = `<p>${err.message}</p>`;
    });
}

function fetchRepos(username) {
  fetch(`https://api.github.com/users/${username}/repos`, {
    headers: { Authorization: `token ${TOKEN}` }
  })
    .then(res => res.json())
    .then(repos => {
      allRepos = repos;
      populateLanguageFilter(repos);
      renderRepoList(repos);
      renderChart(repos);
      reposDiv.classList.remove("hidden");
    });
}

function showProfile(user) {
  profileSkeleton.classList.add("hidden");
  profileDiv.classList.remove("hidden");

  profileDiv.innerHTML = `
    <img src="${user.avatar_url}" width="120" />
    <h2>${user.name || "No name available"}</h2>
    <p>${user.bio || "No bio available"}</p>
    <p>Public Repos: ${user.public_repos}</p>
    <p>Followers: ${user.followers}</p>
  `;
}

function applyRepoFilters() {
  let filtered = [...allRepos];

  if (languageSelect.value) {
    filtered = filtered.filter(r => r.language === languageSelect.value);
  }

  if (sortSelect.value === "stars") {
    filtered.sort((a, b) => b.stargazers_count - a.stargazers_count);
  }

  if (sortSelect.value === "updated") {
    filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  renderRepoList(filtered);
  renderChart(filtered);
}

function renderRepoList(repos) {
  repoList.innerHTML = "";
  repos.slice(0, 10).forEach(repo => {
    const el = document.createElement("div");
    el.className = "repo";
    el.innerHTML = `
      <a href="${repo.html_url}" target="_blank">${repo.name}</a>
      <p>⭐ Stars: ${repo.stargazers_count}</p>
      <p>🛠 Language: ${repo.language || "N/A"}</p>
    `;
    repoList.appendChild(el);
  });
}

function populateLanguageFilter(repos) {
  const languages = new Set();
  repos.forEach(r => r.language && languages.add(r.language));

  languageSelect.innerHTML = '<option value="">All Languages</option>';
  languages.forEach(lang => {
    const opt = document.createElement("option");
    opt.value = lang;
    opt.textContent = lang;
    languageSelect.appendChild(opt);
  });
}

function renderChart(repos) {
  const stats = {};
  repos.forEach(r => r.language && (stats[r.language] = (stats[r.language] || 0) + 1));
  if (!Object.keys(stats).length) return;

  if (languageChart) languageChart.destroy();
  chartCard.classList.remove("hidden");

  languageChart = new Chart(document.getElementById("languageChart"), {
    type: "pie",
    data: {
      labels: Object.keys(stats),
      datasets: [{
        data: Object.values(stats),
        backgroundColor: [
          "#f1e05a", "#3572A5", "#e34c26",
          "#563d7c", "#4F5D95", "#00ADD8"
        ]
      }]
    },
    options: {
      plugins: { legend: { position: "bottom" } }
    }
  });
}

/* ======================================================
   SEARCH HISTORY
====================================================== */
function saveToHistory(username) {
  let history = JSON.parse(localStorage.getItem("searchHistory")) || [];
  history = history.filter(u => u !== username);
  history.unshift(username);
  history = history.slice(0, 5);
  localStorage.setItem("searchHistory", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
  if (!history.length) {
    searchHistoryDiv.classList.add("hidden");
    return;
  }

  searchHistoryDiv.classList.remove("hidden");
  historyList.innerHTML = "";

  history.forEach(user => {
    const el = document.createElement("div");
    el.className = "history-item";
    el.textContent = user;
    el.onclick = () => {
      document.getElementById("username").value = user;
      searchBtn.click();
    };
    historyList.appendChild(el);
  });
}

/* ======================================================
   COMPARE PROFILES (IMPROVED)
====================================================== */
compareBtn.addEventListener("click", () => {
  resetCompareUI();

  const u1 = document.getElementById("user1").value.trim();
  const u2 = document.getElementById("user2").value.trim();

  if (!u1 || !u2) {
    alert("Please enter both usernames");
    return;
  }

  fetchCompareProfile(u1, compareUser1, "chartUser1");
  fetchCompareProfile(u2, compareUser2, "chartUser2");
});

function resetCompareUI() {
  compareUser1.innerHTML = "";
  compareUser2.innerHTML = "";

  if (compareChart1) {
    compareChart1.destroy();
    compareChart1 = null;
  }

  if (compareChart2) {
    compareChart2.destroy();
    compareChart2 = null;
  }
}

function fetchCompareProfile(username, container, canvasId) {
  container.innerHTML = "<p>Loading...</p>";

  fetch(`https://api.github.com/users/${username}`, {
    headers: { Authorization: `token ${TOKEN}` }
  })
    .then(res => res.json())
    .then(user => {
      container.innerHTML = `
        <img src="${user.avatar_url}" width="100" />
        <h3>${user.login}</h3>
        <p>Followers: ${user.followers}</p>
        <p>Public Repos: ${user.public_repos}</p>
      `;

      return fetch(`https://api.github.com/users/${username}/repos`, {
        headers: { Authorization: `token ${TOKEN}` }
      });
    })
    .then(res => res.json())
    .then(repos => {
      const stats = {};
      repos.forEach(r => r.language && (stats[r.language] = (stats[r.language] || 0) + 1));
      renderCompareChart(stats, canvasId);
    })
    .catch(() => {
      container.innerHTML = "<p>Error loading user</p>";
    });
}

function renderCompareChart(stats, canvasId) {
  if (!Object.keys(stats).length) return;

  const ctx = document.getElementById(canvasId);
  const chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(stats),
      datasets: [{
        data: Object.values(stats),
        backgroundColor: [
          "#38bdf8", "#0ea5e9", "#6366f1",
          "#22c55e", "#f59e0b", "#ef4444"
        ]
      }]
    },
    options: {
      plugins: { legend: { position: "bottom" } }
    }
  });

  if (canvasId === "chartUser1") compareChart1 = chart;
  else compareChart2 = chart;
}

/* ---------- INIT ---------- */
renderHistory();
showView(homeView);
