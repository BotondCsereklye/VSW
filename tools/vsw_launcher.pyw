from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from queue import Empty, Queue
import subprocess
import threading
import tkinter as tk
from tkinter import messagebox, scrolledtext, ttk
from typing import Callable
import webbrowser

from vsw_launcher_support import (
    RuntimePaths,
    backend_dependencies_ready,
    ensure_backend_venv,
    find_runtime_paths,
    frontend_dependencies_ready,
    wait_for_port,
)


BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5173"


@dataclass
class ManagedProcess:
    name: str
    process: subprocess.Popen[str]


class LauncherApp(tk.Tk):
    def __init__(self, project_root: Path) -> None:
        super().__init__()
        self.project_root = project_root
        self.runtime: RuntimePaths | None = None
        self.backend_process: ManagedProcess | None = None
        self.frontend_process: ManagedProcess | None = None
        self.event_queue: Queue[tuple[str, str, str]] = Queue()
        self.busy = False

        self.title("VSW Launcher")
        self.geometry("980x720")
        self.minsize(840, 620)
        self.configure(bg="#eef4fb")
        self.protocol("WM_DELETE_WINDOW", self.handle_close)

        self.python_status = tk.StringVar(value="Not checked")
        self.backend_status = tk.StringVar(value="Stopped")
        self.frontend_status = tk.StringVar(value="Stopped")
        self.note_status = tk.StringVar(value="Ready for setup")

        self._build_ui()
        self.after(100, self._drain_queue)

    def _build_ui(self) -> None:
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("Card.TFrame", background="#fbfdff")
        style.configure("Hero.TFrame", background="#fbfdff")
        style.configure("Title.TLabel", background="#fbfdff", foreground="#132844", font=("Segoe UI", 24, "bold"))
        style.configure("Subtitle.TLabel", background="#fbfdff", foreground="#49607c", font=("Segoe UI", 11))
        style.configure("StatusLabel.TLabel", background="#fbfdff", foreground="#25415f", font=("Segoe UI", 10, "bold"))
        style.configure("Primary.TButton", font=("Segoe UI", 10, "bold"))

        outer = ttk.Frame(self, padding=18, style="Card.TFrame")
        outer.pack(fill="both", expand=True, padx=18, pady=18)

        hero = ttk.Frame(outer, padding=24, style="Hero.TFrame")
        hero.pack(fill="x")

        ttk.Label(hero, text="VSW launcher", style="Subtitle.TLabel").pack(anchor="w")
        ttk.Label(hero, text="Start backend and frontend without juggling terminals.", style="Title.TLabel").pack(anchor="w", pady=(6, 10))
        ttk.Label(
            hero,
            text="Recommended path: a local launcher app for the full defensive scanner now, browser extension integration later as link capture only.",
            style="Subtitle.TLabel",
            wraplength=860,
            justify="left",
        ).pack(anchor="w")

        controls = ttk.Frame(outer, padding=(0, 16, 0, 0), style="Card.TFrame")
        controls.pack(fill="x")

        button_row = ttk.Frame(controls, style="Card.TFrame")
        button_row.pack(fill="x")
        ttk.Button(button_row, text="Setup or update", command=lambda: self.run_in_background(self.prepare_environment), style="Primary.TButton").pack(side="left", padx=(0, 10))
        ttk.Button(button_row, text="Start VSW", command=lambda: self.run_in_background(self.start_services), style="Primary.TButton").pack(side="left", padx=(0, 10))
        ttk.Button(button_row, text="Open app", command=lambda: webbrowser.open(FRONTEND_URL)).pack(side="left", padx=(0, 10))
        ttk.Button(button_row, text="Open API docs", command=lambda: webbrowser.open(f"{BACKEND_URL}/docs")).pack(side="left", padx=(0, 10))
        ttk.Button(button_row, text="Stop services", command=self.stop_services).pack(side="left")

        status_grid = ttk.Frame(outer, padding=(0, 16, 0, 0), style="Card.TFrame")
        status_grid.pack(fill="x")
        for column in range(3):
            status_grid.columnconfigure(column, weight=1)

        self._status_card(status_grid, 0, "Python runtime", self.python_status)
        self._status_card(status_grid, 1, "Backend", self.backend_status)
        self._status_card(status_grid, 2, "Frontend", self.frontend_status)

        note_card = ttk.Frame(outer, padding=18, style="Card.TFrame")
        note_card.pack(fill="x", pady=(14, 0))
        ttk.Label(note_card, text="Launcher note", style="StatusLabel.TLabel").pack(anchor="w")
        ttk.Label(note_card, textvariable=self.note_status, style="Subtitle.TLabel", wraplength=860, justify="left").pack(anchor="w", pady=(6, 0))

        log_card = ttk.Frame(outer, padding=18, style="Card.TFrame")
        log_card.pack(fill="both", expand=True, pady=(14, 0))
        ttk.Label(log_card, text="Live output", style="StatusLabel.TLabel").pack(anchor="w")

        self.log_widget = scrolledtext.ScrolledText(
            log_card,
            wrap="word",
            font=("Consolas", 10),
            bg="#132844",
            fg="#f4f7fb",
            insertbackground="#f4f7fb",
            relief="flat",
            height=20,
        )
        self.log_widget.pack(fill="both", expand=True, pady=(10, 0))
        self.log_widget.configure(state="disabled")

    def _status_card(self, parent: ttk.Frame, column: int, title: str, variable: tk.StringVar) -> None:
        card = ttk.Frame(parent, padding=18, style="Card.TFrame")
        card.grid(row=0, column=column, sticky="nsew", padx=(0 if column == 0 else 8, 0))
        ttk.Label(card, text=title, style="StatusLabel.TLabel").pack(anchor="w")
        ttk.Label(card, textvariable=variable, style="Subtitle.TLabel").pack(anchor="w", pady=(8, 0))

    def queue_log(self, source: str, message: str) -> None:
        self.event_queue.put(("log", source, message.rstrip()))

    def queue_status(self, field: str, value: str) -> None:
        self.event_queue.put(("status", field, value))

    def _drain_queue(self) -> None:
        try:
            while True:
                event_type, field, value = self.event_queue.get_nowait()
                if event_type == "log":
                    self.log_widget.configure(state="normal")
                    self.log_widget.insert("end", f"[{field}] {value}\n")
                    self.log_widget.see("end")
                    self.log_widget.configure(state="disabled")
                elif event_type == "status":
                    self._apply_status(field, value)
        except Empty:
            pass
        finally:
            self.after(100, self._drain_queue)

    def _apply_status(self, field: str, value: str) -> None:
        mapping = {
            "python": self.python_status,
            "backend": self.backend_status,
            "frontend": self.frontend_status,
            "note": self.note_status,
        }
        variable = mapping.get(field)
        if variable:
            variable.set(value)

    def run_in_background(self, task: Callable[[], None]) -> None:
        if self.busy:
            self.queue_log("system", "Another launcher task is already running.")
            return

        def wrapped() -> None:
            self.busy = True
            try:
                task()
            except Exception as exc:  # noqa: BLE001
                self.queue_log("system", f"Task failed: {exc}")
                self.queue_status("note", f"Task failed: {exc}")
            finally:
                self.busy = False

        threading.Thread(target=wrapped, daemon=True).start()

    def prepare_environment(self) -> None:
        self.queue_status("note", "Detecting runtimes and preparing dependencies...")
        self.runtime = find_runtime_paths(self.project_root)
        self.queue_status("python", f"{self.runtime.bootstrap_python} (compatible)")
        self.queue_log("system", f"Using Python: {self.runtime.bootstrap_python}")
        self.queue_log("system", f"Using npm: {self.runtime.npm_cmd}")

        ensure_backend_venv(self.runtime)

        if not backend_dependencies_ready(self.runtime):
            self.queue_log("backend", "Installing backend dependencies...")
            self._stream_command(
                [str(self.runtime.backend_python), "-m", "pip", "install", "-e", ".[dev]"],
                self.runtime.backend_path,
                "backend",
            )
        else:
            self.queue_log("backend", "Backend dependencies already available.")

        if not frontend_dependencies_ready(self.runtime):
            self.queue_log("frontend", "Installing frontend dependencies...")
            self._stream_command(
                [str(self.runtime.npm_cmd), "install"],
                self.runtime.frontend_path,
                "frontend",
            )
        else:
            self.queue_log("frontend", "Frontend dependencies already available.")

        self.queue_status("note", "Environment ready. You can start VSW now.")

    def start_services(self) -> None:
        if self.runtime is None:
            self.prepare_environment()

        assert self.runtime is not None

        if self.backend_process and self.backend_process.process.poll() is None:
            self.queue_log("backend", "Backend is already running.")
        else:
            self.queue_status("backend", "Starting...")
            self.backend_process = self._start_process(
                "backend",
                [
                    str(self.runtime.backend_python),
                    "-m",
                    "uvicorn",
                    "app.main:app",
                    "--reload",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "8000",
                ],
                self.runtime.backend_path,
            )

        if not wait_for_port("127.0.0.1", 8000, 12):
            self.queue_status("backend", "Failed to start")
            raise RuntimeError("Backend did not become reachable on 127.0.0.1:8000.")
        self.queue_status("backend", "Running on 127.0.0.1:8000")

        if self.frontend_process and self.frontend_process.process.poll() is None:
            self.queue_log("frontend", "Frontend is already running.")
        else:
            self.queue_status("frontend", "Starting...")
            self.frontend_process = self._start_process(
                "frontend",
                [str(self.runtime.npm_cmd), "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
                self.runtime.frontend_path,
            )

        if not wait_for_port("127.0.0.1", 5173, 18):
            self.queue_status("frontend", "Failed to start")
            raise RuntimeError("Frontend did not become reachable on 127.0.0.1:5173.")
        self.queue_status("frontend", "Running on 127.0.0.1:5173")
        self.queue_status("note", "VSW is running. Opening the app in your browser.")
        webbrowser.open(FRONTEND_URL)

    def _start_process(self, name: str, command: list[str], cwd: Path) -> ManagedProcess:
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        process = subprocess.Popen(
            command,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            creationflags=creationflags,
        )
        threading.Thread(target=self._read_process_output, args=(name, process), daemon=True).start()
        self.queue_log(name, f"Started with command: {' '.join(command)}")
        return ManagedProcess(name=name, process=process)

    def _read_process_output(self, source: str, process: subprocess.Popen[str]) -> None:
        assert process.stdout is not None
        for line in process.stdout:
            self.queue_log(source, line)
        exit_code = process.wait()
        if source == "backend":
            self.queue_status("backend", f"Stopped (exit code {exit_code})")
        if source == "frontend":
            self.queue_status("frontend", f"Stopped (exit code {exit_code})")
        self.queue_log(source, f"Process exited with code {exit_code}.")

    def _stream_command(self, command: list[str], cwd: Path, source: str) -> None:
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        process = subprocess.Popen(
            command,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            creationflags=creationflags,
        )
        assert process.stdout is not None
        for line in process.stdout:
            self.queue_log(source, line)
        if process.wait() != 0:
            raise RuntimeError(f"{source} command failed: {' '.join(command)}")

    def stop_services(self) -> None:
        self._stop_process(self.frontend_process, "frontend")
        self._stop_process(self.backend_process, "backend")
        self.frontend_process = None
        self.backend_process = None
        self.queue_status("note", "Launcher stopped all managed services.")

    def _stop_process(self, managed: ManagedProcess | None, source: str) -> None:
        if managed is None or managed.process.poll() is not None:
            return

        managed.process.terminate()
        try:
            managed.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            managed.process.kill()
            managed.process.wait(timeout=3)
        self.queue_status(source, "Stopped")
        self.queue_log(source, "Service stopped by launcher.")

    def handle_close(self) -> None:
        if self.backend_process or self.frontend_process:
            should_close = messagebox.askyesno(
                "Close VSW Launcher",
                "Stop managed services and close the launcher?",
            )
            if not should_close:
                return
        self.stop_services()
        self.destroy()


def main() -> None:
    launcher_file = Path(__file__).resolve()
    project_root = launcher_file.parent.parent
    app = LauncherApp(project_root)
    app.mainloop()


if __name__ == "__main__":
    main()
