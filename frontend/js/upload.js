const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const chooseFileBtn = document.getElementById("choose-file-btn");
const selectedFileBox = document.getElementById("selected-file");
const selectedFileName = document.getElementById("selected-file-name");
const selectedFileSize = document.getElementById("selected-file-size");
const generateBtn = document.getElementById("generate-btn");
const errorMessage = document.getElementById("error-message");
const loadingScreen = document.getElementById("loading-screen");
const loadingStep = document.getElementById("loading-step");
const usageCounter = document.getElementById("usage-counter");

let selectedFile = null;


async function refreshUsageCounter() {
  try {
    const res = await apiFetch("/api/usage");
    const data = await res.json();
    usageCounter.textContent = `Daily uploads: ${data.used} / ${data.limit}`;
    if (data.remaining <= 0) {
      showError(
        "You've reached today's 4-upload limit. Come back tomorrow and keep studying!"
      );
      dropzone.style.opacity = "0.5";
      dropzone.style.pointerEvents = "none";
    }
    window.StudyQuizContext = {
      page: "upload",
      dailyUploadsUsed: data.used,
      dailyUploadsLimit: data.limit,
      dailyUploadsRemaining: data.remaining,
      ...previousReviewContext((await fetchQuizHistory({ limit: 1 }))[0]),
    };
  } catch (err) {
    usageCounter.textContent = "Daily uploads: -- / --";
  }
}


chooseFileBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    handleFileSelected(fileInput.files[0]);
  }
});


["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFileSelected(files[0]);
  }
});

function handleFileSelected(file) {
  hideError();

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    showError(
      " This file type isn't supported. Please upload a PDF, JPG, JPEG, PNG, or WEBP file."
    );
    return;
  }

  const maxSizeBytes = 10 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    showError(" Your file is too large. Maximum file size is 10 MB.");
    return;
  }

  selectedFile = file;
  const icon = file.type === "application/pdf" ? "📄" : "🖼️";
  selectedFileName.textContent = `${icon} ${file.name}`;
  selectedFileSize.textContent = `Size: ${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  selectedFileBox.hidden = false;
}


generateBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  hideError();
  selectedFileBox.hidden = true;
  loadingScreen.hidden = false;

  try {
  
    loadingStep.textContent = "Extracting your notes...";
    const formData = new FormData();
    formData.append("file", selectedFile);

    const uploadRes = await apiFetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      throw new Error(uploadData.error || "Upload failed.");
    }

    loadingStep.textContent = "Creating questions...";
    const quizRes = await apiFetch("/api/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileId: uploadData.fileId,
        originalName: uploadData.originalName,
      }),
    });
    const quizData = await quizRes.json();

    if (!quizRes.ok) {
      throw new Error(quizData.error || "Could not generate the quiz.");
    }

    loadingStep.textContent = "Preparing your game...";

 
    window.location.href = `quiz.html?id=${encodeURIComponent(quizData.quizId)}`;
  } catch (err) {
    loadingScreen.hidden = true;
    showError(err.message || "😕 We couldn't generate your quiz. Please try again.");
    selectedFileBox.hidden = false;
  }
});

function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.hidden = false;
}

function hideError() {
  errorMessage.hidden = true;
  errorMessage.textContent = "";
}

document.addEventListener("DOMContentLoaded", refreshUsageCounter);
