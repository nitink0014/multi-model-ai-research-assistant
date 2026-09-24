import { useEffect, useRef, useState } from "react";
import axios from "axios";
import api, { API_URL } from "./api";

function App() {
  const [token, setToken] = useState(() => {
    return localStorage.getItem("access_token") || "";
  });

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    return savedUser
      ? JSON.parse(savedUser)
      : null;
  });

  const [sessionId, setSessionId] = useState("");

  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documents, setDocuments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user?.id) {
      setSessionId("");
      return;
    }

    const storageKey = `ai_session_id_${user.id}`;

    let savedSessionId =
      localStorage.getItem(storageKey);

    if (!savedSessionId) {
      savedSessionId = crypto.randomUUID();

      localStorage.setItem(
        storageKey,
        savedSessionId
      );
    }

    setMessages([]);
    setDocuments([]);
    setSessions([]);
    setQuestion("");
    setUploadMessage("");
    setDocumentName("");
    setFile(null);

    setSessionId(savedSessionId);
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          email,
          password,
        }
      );

      const accessToken =
        response.data.access_token;

      const loggedInUser =
        response.data.user;

      localStorage.setItem(
        "access_token",
        accessToken
      );

      localStorage.setItem(
        "user",
        JSON.stringify(loggedInUser)
      );

      setMessages([]);
      setDocuments([]);
      setSessions([]);
      setQuestion("");
      setDocumentName("");
      setUploadMessage("");
      setFile(null);

      setToken(accessToken);
      setUser(loggedInUser);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.detail ||
          "Login failed",
      };
    }
  };

  const signup = async (
    name,
    email,
    password
  ) => {
    try {
      await axios.post(
        `${API_URL}/auth/signup`,
        {
          name,
          email,
          password,
        }
      );

      return await login(
        email,
        password
      );
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.detail ||
          "Signup failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem(
      "user"
    );

    setToken("");
    setUser(null);
    setSessionId("");

    setMessages([]);
    setDocuments([]);
    setSessions([]);

    setQuestion("");
    setDocumentName("");
    setFile(null);
    setUploadMessage("");

    setAuthEmail("");
    setAuthPassword("");
    setAuthName("");
    setAuthError("");
    setAuthMode("login");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const loadDocuments = async (
    selectedSessionId = sessionId
  ) => {
    if (
      !localStorage.getItem("access_token") ||
      !selectedSessionId
    ) {
      return;
    }

    try {
      const response = await api.get(
        "/documents",
        {
          params: {
            session_id: selectedSessionId,
          },
        }
      );

      setDocuments(
        response.data.documents || []
      );
    } catch (error) {
      console.error(
        "Load documents error:",
        error
      );

      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  const loadSessions = async () => {
    if (
      !localStorage.getItem("access_token")
    ) {
      return;
    }

    try {
      const response = await api.get(
        "/sessions"
      );

      setSessions(
        response.data.sessions || []
      );
    } catch (error) {
      console.error(
        "Load sessions error:",
        error
      );

      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  const loadSession = async (
    selectedSessionId
  ) => {
    if (!selectedSessionId) {
      return;
    }

    try {
      const response = await api.get(
        `/sessions/${selectedSessionId}`
      );

      if (user?.id) {
        localStorage.setItem(
          `ai_session_id_${user.id}`,
          selectedSessionId
        );
      }

      setSessionId(
        selectedSessionId
      );

      setMessages(
        response.data.messages || []
      );

      setQuestion("");
      setUploadMessage("");
      setDocumentName("");
      setFile(null);

      await loadDocuments(
        selectedSessionId
      );

      setMobileMenuOpen(false);
    } catch (error) {
      console.error(
        "Load session error:",
        error
      );

      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  useEffect(() => {
    if (
      !token ||
      !user?.id ||
      !sessionId
    ) {
      return;
    }

    loadDocuments(sessionId);
    loadSessions();
  }, [
    token,
    user?.id,
    sessionId,
  ]);

  const newChat = () => {
    if (!user?.id) {
      return;
    }

    const newSessionId =
      crypto.randomUUID();

    const storageKey =
      `ai_session_id_${user.id}`;

    localStorage.setItem(
      storageKey,
      newSessionId
    );

    setSessionId(newSessionId);

    setMessages([]);
    setQuestion("");
    setUploadMessage("");
    setDocuments([]);
    setDocumentName("");
    setFile(null);
    setMobileMenuOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event) => {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.type !==
      "application/pdf"
    ) {
      setFile(null);
      setDocumentName("");

      setUploadMessage(
        "Please select a PDF file."
      );

      return;
    }

    setFile(selectedFile);
    setDocumentName(
      selectedFile.name
    );

    setUploadMessage("");
  };

  const handleDrop = (event) => {
    event.preventDefault();

    setDragActive(false);

    const selectedFile =
      event.dataTransfer.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.type !==
      "application/pdf"
    ) {
      setFile(null);
      setDocumentName("");

      setUploadMessage(
        "Please select a PDF file."
      );

      return;
    }

    setFile(selectedFile);

    setDocumentName(
      selectedFile.name
    );

    setUploadMessage("");
  };

  const handleDragOver = (event) => {
    event.preventDefault();

    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();

    setDragActive(false);
  };

  const uploadPDF = async () => {
    if (!file) {
      setUploadMessage(
        "Please select a PDF first."
      );

      return;
    }

    if (!sessionId) {
      setUploadMessage(
        "Session is not ready."
      );

      return;
    }

    try {
      setUploading(true);

      setUploadMessage(
        "Uploading and indexing PDF..."
      );

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response = await api.post(
        "/upload",
        formData,
        {
          params: {
            session_id: sessionId,
          },
        }
      );

      setUploadMessage(
        response.data.message ||
          "PDF uploaded successfully."
      );

      setDocumentName(
        response.data.filename
      );

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadDocuments(
        sessionId
      );
    } catch (error) {
      console.error(
        "Upload error:",
        error
      );

      if (error.response?.status === 401) {
        logout();
        return;
      }

      setUploadMessage(
        error.response?.data?.detail ||
          "PDF upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (
    filename
  ) => {
    if (
      !filename ||
      !sessionId
    ) {
      return;
    }

    try {
      await api.delete(
        `/documents/${encodeURIComponent(
          filename
        )}`,
        {
          params: {
            session_id: sessionId,
          },
        }
      );

      await loadDocuments(
        sessionId
      );

      if (
        documentName === filename
      ) {
        setDocumentName("");
      }
    } catch (error) {
      console.error(
        "Delete document error:",
        error
      );

      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  const sendMessage = async () => {
    const trimmedQuestion =
      question.trim();

    if (
      !trimmedQuestion ||
      loading ||
      !sessionId
    ) {
      return;
    }

    const userMessage = {
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const response = await api.post(
        "/chat",
        {
          session_id: sessionId,
          question: trimmedQuestion,
          context: "",
        }
      );

      const assistantMessage = {
        role: "assistant",

        content:
          response.data.answer ||
          "No response received.",

        model:
          response.data.model,

        preferred_model:
          response.data.preferred_model,

        use_rag:
          response.data.use_rag,

        use_web_search:
          response.data.use_web_search,

        sources:
          response.data.sources || [],

        document_sources:
          response.data.document_sources ||
          [],
      };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);

      await loadSessions();
    } catch (error) {
      console.error(
        "Chat error:",
        error
      );

      if (error.response?.status === 401) {
        logout();
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",

          content:
            error.response?.data?.detail ||
            "Something went wrong while generating the response.",

          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    if (!sessionId) {
      return;
    }

    try {
      await api.post(
        "/chat/clear",
        {
          session_id: sessionId,
        }
      );

      setMessages([]);

      await loadSessions();
    } catch (error) {
      console.error(
        "Clear chat error:",
        error
      );

      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  };

  const handleAuthSubmit = async (
    event
  ) => {
    event.preventDefault();

    setAuthError("");

    if (
      authMode === "signup" &&
      !authName.trim()
    ) {
      setAuthError(
        "Name is required."
      );

      return;
    }

    if (!authEmail.trim()) {
      setAuthError(
        "Email is required."
      );

      return;
    }

    if (!authPassword) {
      setAuthError(
        "Password is required."
      );

      return;
    }

    if (
      authPassword.length < 8
    ) {
      setAuthError(
        "Password must be at least 8 characters."
      );

      return;
    }

    try {
      setAuthLoading(true);

      let result;

      if (
        authMode === "signup"
      ) {
        result = await signup(
          authName,
          authEmail,
          authPassword
        );
      } else {
        result = await login(
          authEmail,
          authPassword
        );
      }

      if (!result.success) {
        setAuthError(
          result.message
        );

        return;
      }

      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
      setAuthError("");
    } finally {
      setAuthLoading(false);
    }
  };

  const renderContentWithCitations = (
    content,
    sources = []
  ) => {
    if (!content) {
      return null;
    }

    const parts = content.split(
      /(\[Source \d+\])/g
    );

    return parts.map(
      (part, index) => {
        const match = part.match(
          /\[Source (\d+)\]/
        );

        if (!match) {
          return (
            <span key={index}>
              {part}
            </span>
          );
        }

        const sourceId =
          Number(match[1]);

        const source =
          sources.find(
            (item) =>
              item.id === sourceId
          );

        if (!source?.url) {
          return (
            <span
              key={index}
              className="text-blue-400"
            >
              {part}
            </span>
          );
        }

        return (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            {part}
          </a>
        );
      }
    );
  };

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-2xl font-bold text-white">
                AI
              </span>
            </div>

            <h1 className="text-3xl font-bold text-white">
              AI Research Assistant
            </h1>

            <p className="text-slate-400 mt-2">
              Multi-model AI, RAG and web research
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="flex bg-slate-950 rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(
                    "login"
                  );

                  setAuthError("");
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                  authMode === "login"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode(
                    "signup"
                  );

                  setAuthError("");
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                  authMode === "signup"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sign Up
              </button>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">
                {authMode ===
                "login"
                  ? "Welcome back"
                  : "Create your account"}
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                {authMode ===
                "login"
                  ? "Login to continue your research."
                  : "Create an account to start researching."}
              </p>
            </div>

            <form
              onSubmit={
                handleAuthSubmit
              }
              className="space-y-4"
            >
              {authMode ===
                "signup" && (
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Name
                  </label>

                  <input
                    type="text"
                    value={
                      authName
                    }
                    onChange={(
                      event
                    ) =>
                      setAuthName(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Enter your name"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-blue-500 transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Email
                </label>

                <input
                  type="email"
                  value={
                    authEmail
                  }
                  onChange={(
                    event
                  ) =>
                    setAuthEmail(
                      event.target
                        .value
                    )
                  }
                  placeholder="you@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Password
                </label>

                <input
                  type="password"
                  value={
                    authPassword
                  }
                  onChange={(
                    event
                  ) =>
                    setAuthPassword(
                      event.target
                        .value
                    )
                  }
                  placeholder="Minimum 8 characters"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-blue-500 transition"
                />
              </div>

              {authError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  authLoading
                }
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-xl py-3 transition"
              >
                {authLoading
                  ? "Please wait..."
                  : authMode ===
                    "login"
                  ? "Login"
                  : "Create Account"}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              {authMode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}

              <button
                type="button"
                onClick={() => {
                  setAuthMode(
                    authMode ===
                      "login"
                      ? "signup"
                      : "login"
                  );

                  setAuthError("");
                }}
                className="text-blue-400 hover:text-blue-300 ml-2 font-medium"
              >
                {authMode ===
                "login"
                  ? "Sign up"
                  : "Login"}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <aside className="hidden lg:flex w-80 border-r border-slate-800 bg-slate-900/60 flex-col h-screen sticky top-0">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
              AI
            </div>

            <div>
              <h1 className="font-semibold">
                Research Assistant
              </h1>

              <p className="text-xs text-slate-500">
                Multi-model RAG
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={newChat}
            className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl py-3 font-medium transition"
          >
            + New Chat
          </button>
        </div>

        <div className="px-4 pb-4">
          <div
            onDragOver={
              handleDragOver
            }
            onDragLeave={
              handleDragLeave
            }
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-4 text-center transition ${
              dragActive
                ? "border-blue-500 bg-blue-500/10"
                : "border-slate-700 bg-slate-900"
            }`}
          >
            <p className="text-sm text-slate-300">
              Drop PDF here
            </p>

            <p className="text-xs text-slate-500 my-2">
              or
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={
                handleFileChange
              }
              className="hidden"
              id="pdf-upload"
            />

            <label
              htmlFor="pdf-upload"
              className="inline-block cursor-pointer text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition"
            >
              Choose PDF
            </label>

            {file && (
              <p className="text-xs text-blue-400 mt-3 break-all">
                {file.name}
              </p>
            )}

            <button
              onClick={uploadPDF}
              disabled={
                !file ||
                uploading ||
                !sessionId
              }
              className="w-full mt-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg py-2 text-sm transition"
            >
              {uploading
                ? "Uploading..."
                : "Upload PDF"}
            </button>
          </div>

          {uploadMessage && (
            <p className="text-xs text-slate-400 mt-2">
              {uploadMessage}
            </p>
          )}
        </div>

        <div className="px-4 pb-4">
          <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
            Documents
          </h2>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {documents.length ===
            0 ? (
              <p className="text-sm text-slate-600">
                No documents
              </p>
            ) : (
              documents.map(
                (document) => (
                  <div
                    key={
                      document.filename
                    }
                    className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-300 truncate">
                        {
                          document.filename
                        }
                      </p>

                      <p className="text-xs text-slate-600 mt-1">
                        {
                          document.chunk_count
                        }{" "}
                        chunks
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        deleteDocument(
                          document.filename
                        )
                      }
                      className="text-slate-600 hover:text-red-400 text-sm"
                    >
                      ×
                    </button>
                  </div>
                )
              )
            )}
          </div>
        </div>

        <div className="px-4 flex-1 min-h-0">
          <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
            Chat History
          </h2>

          <div className="space-y-2 overflow-y-auto max-h-full pb-4">
            {sessions.length ===
            0 ? (
              <p className="text-sm text-slate-600">
                No chat history
              </p>
            ) : (
              sessions.map(
                (session) => (
                  <button
                    key={
                      session.session_id
                    }
                    onClick={() =>
                      loadSession(
                        session.session_id
                      )
                    }
                    className={`w-full text-left rounded-lg p-3 transition ${
                      session.session_id ===
                      sessionId
                        ? "bg-blue-500/10 border border-blue-500/30"
                        : "bg-slate-900 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <p className="text-sm text-slate-300 truncate">
                      {
                        session.title
                      }
                    </p>

                    <p className="text-xs text-slate-600 mt-1">
                      {
                        session.message_count
                      }{" "}
                      messages
                    </p>
                  </button>
                )
              )
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.name}
              </p>

              <p className="text-xs text-slate-500 truncate">
                {user?.email}
              </p>
            </div>

            <button
              onClick={logout}
              className="text-xs px-3 py-2 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          />

          <aside className="absolute left-0 top-0 bottom-0 w-[88%] max-w-sm bg-slate-950 border-r border-slate-800 flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
                  AI
                </div>

                <div>
                  <h1 className="font-semibold">Research Assistant</h1>
                  <p className="text-xs text-slate-500">Multi-model RAG</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-9 h-9 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-lg text-xl"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <button
                  onClick={newChat}
                  className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl py-3 font-medium transition"
                >
                  + New Chat
                </button>
              </div>

              <div className="px-4 pb-5">
                <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                  Upload PDF
                </h2>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition ${
                    dragActive
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-700 bg-slate-900"
                  }`}
                >
                  <p className="text-sm text-slate-300">Select a PDF</p>

                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="mobile-pdf-upload"
                  />

                  <label
                    htmlFor="mobile-pdf-upload"
                    className="inline-block mt-3 cursor-pointer text-sm bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition"
                  >
                    Choose PDF
                  </label>

                  {file && (
                    <p className="text-xs text-blue-400 mt-3 break-all">
                      {file.name}
                    </p>
                  )}

                  <button
                    onClick={uploadPDF}
                    disabled={!file || uploading || !sessionId}
                    className="w-full mt-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg py-2 text-sm transition"
                  >
                    {uploading ? "Uploading..." : "Upload PDF"}
                  </button>
                </div>

                {uploadMessage && (
                  <p className="text-xs text-slate-400 mt-2">
                    {uploadMessage}
                  </p>
                )}
              </div>

              <div className="px-4 pb-5">
                <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                  Documents
                </h2>

                <div className="space-y-2">
                  {documents.length === 0 ? (
                    <p className="text-sm text-slate-600">No documents</p>
                  ) : (
                    documents.map((document) => (
                      <div
                        key={document.filename}
                        className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-slate-300 truncate">
                            {document.filename}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {document.chunk_count} chunks
                          </p>
                        </div>

                        <button
                          onClick={() => deleteDocument(document.filename)}
                          className="text-slate-600 hover:text-red-400"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="px-4 pb-5">
                <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                  Chat History
                </h2>

                <div className="space-y-2">
                  {sessions.length === 0 ? (
                    <p className="text-sm text-slate-600">No chat history</p>
                  ) : (
                    sessions.map((session) => (
                      <button
                        key={session.session_id}
                        onClick={() => loadSession(session.session_id)}
                        className={`w-full text-left rounded-lg p-3 transition ${
                          session.session_id === sessionId
                            ? "bg-blue-500/10 border border-blue-500/30"
                            : "bg-slate-900 border border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <p className="text-sm text-slate-300 truncate">
                          {session.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {session.message_count} messages
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>

                <button
                  onClick={logout}
                  className="text-xs px-3 py-2 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition"
                >
                  Logout
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col h-screen">
        <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 shrink-0 flex items-center justify-center bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xl"
              aria-label="Open menu"
            >
              ☰
            </button>

            <div className="min-w-0">
              <h2 className="font-semibold truncate">AI Research Assistant</h2>
              <p className="text-xs text-slate-500 hidden sm:block">
                Ask questions, analyze PDFs and search the web
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              disabled={!sessionId}
              className="text-sm bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-2 rounded-lg disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            {messages.length ===
            0 ? (
              <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center max-w-xl">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold shadow-lg shadow-blue-500/10">
                    AI
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold mt-6">
                    What are you
                    researching?
                  </h2>

                  <p className="text-slate-400 mt-3 leading-7">
                    Ask a general
                    question, upload a PDF
                    for RAG, or ask about
                    recent information for
                    web-assisted research.
                  </p>

                  {documents.length >
                    0 && (
                    <div className="mt-6 inline-flex items-center bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-full px-4 py-2 text-sm">
                      {
                        documents.length
                      }{" "}
                      document
                      {documents.length >
                      1
                        ? "s"
                        : ""}{" "}
                      available
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map(
                  (
                    message,
                    index
                  ) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role ===
                        "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[90%] sm:max-w-[80%] ${
                          message.role ===
                          "user"
                            ? "bg-blue-600 rounded-2xl rounded-br-md px-4 py-3"
                            : "w-full"
                        }`}
                      >
                        {message.role ===
                          "assistant" && (
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                              AI
                            </div>

                            <span className="text-sm font-medium">
                              Research
                              Assistant
                            </span>
                          </div>
                        )}

                        <div
                          className={`whitespace-pre-wrap leading-7 ${
                            message.error
                              ? "text-red-400"
                              : message.role ===
                                "assistant"
                              ? "text-slate-200"
                              : "text-white"
                          }`}
                        >
                          {message.role ===
                          "assistant"
                            ? renderContentWithCitations(
                                message.content,
                                message.sources
                              )
                            : message.content}
                        </div>

                        {message.role ===
                          "assistant" && (
                          <>
                            <div className="flex flex-wrap gap-2 mt-4">
                              {message.model && (
                                <span className="text-xs bg-slate-900 border border-slate-800 rounded-full px-3 py-1 text-slate-400">
                                  Model:{" "}
                                  {
                                    message.model
                                  }
                                </span>
                              )}

                              {message.use_rag && (
                                <span className="text-xs bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1 text-purple-300">
                                  RAG
                                </span>
                              )}

                              {message.use_web_search && (
                                <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 text-emerald-300">
                                  Web Search
                                </span>
                              )}
                            </div>

                            {message.sources
                              ?.length >
                              0 && (
                              <div className="mt-4 border-t border-slate-800 pt-4">
                                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                                  Web Sources
                                </p>

                                <div className="space-y-2">
                                  {message.sources.map(
                                    (
                                      source
                                    ) => (
                                      <a
                                        key={
                                          source.id
                                        }
                                        href={
                                          source.url
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block text-sm text-blue-400 hover:text-blue-300 truncate"
                                      >
                                        [
                                        Source{" "}
                                        {
                                          source.id
                                        }
                                        ]{" "}
                                        {
                                          source.title
                                        }
                                      </a>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                )}

                {loading && (
                  <div className="flex justify-start">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                          AI
                        </div>

                        <span className="text-sm font-medium">
                          Research
                          Assistant
                        </span>
                      </div>

                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                      </div>
                    </div>
                  </div>
                )}

                <div
                  ref={
                    messagesEndRef
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-800 bg-slate-950 px-4 sm:px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-900 border border-slate-700 focus-within:border-blue-500 rounded-2xl p-2 transition">
              <textarea
                value={question}
                onChange={(event) =>
                  setQuestion(
                    event.target
                      .value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="Ask anything..."
                rows="2"
                className="w-full resize-none bg-transparent outline-none px-3 py-2 text-white placeholder-slate-600"
              />

              <div className="flex items-center justify-between px-2 pb-1">
                <div className="text-xs text-slate-600">
                  Enter to send ·
                  Shift+Enter for new
                  line
                </div>

                <button
                  onClick={
                    sendMessage
                  }
                  disabled={
                    loading ||
                    !question.trim() ||
                    !sessionId
                  }
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 px-5 py-2 rounded-xl text-sm font-medium transition"
                >
                  {loading
                    ? "Thinking..."
                    : "Send"}
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-slate-600 mt-2">
              AI responses may contain
              mistakes. Verify important
              research.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;