from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os
import re
import shutil
import socket
import subprocess
import sys
import time


MIN_PYTHON = (3, 12)


@dataclass(frozen=True)
class RuntimePaths:
    project_root: Path
    backend_path: Path
    frontend_path: Path
    backend_python: Path
    bootstrap_python: Path
    npm_cmd: Path


def find_runtime_paths(project_root: Path) -> RuntimePaths:
    bootstrap_python = select_compatible_python(project_root)
    npm_cmd = find_npm_cmd()
    backend_path = project_root / "backend"
    frontend_path = project_root / "frontend"
    backend_python = backend_path / ".venv" / "Scripts" / "python.exe"
    return RuntimePaths(
        project_root=project_root,
        backend_path=backend_path,
        frontend_path=frontend_path,
        backend_python=backend_python,
        bootstrap_python=bootstrap_python,
        npm_cmd=npm_cmd,
    )


def select_compatible_python(project_root: Path) -> Path:
    for candidate in iter_python_candidates(project_root):
        if is_compatible_python(candidate):
            return candidate
    version = ".".join(str(part) for part in MIN_PYTHON)
    raise RuntimeError(f"No compatible Python found. Install Python {version}+ and try again.")


def iter_python_candidates(project_root: Path) -> list[Path]:
    candidates: list[Path] = []
    add_candidate(candidates, os.environ.get("VSW_PYTHON"))
    add_candidate(candidates, project_root / "backend" / ".venv" / "Scripts" / "python.exe")
    add_candidate(candidates, sys.executable)

    for path in parse_py_launcher_paths():
        add_candidate(candidates, path)

    local_app_data = Path(os.environ.get("LOCALAPPDATA", ""))
    if local_app_data:
        for version in ("314", "313", "312"):
            add_candidate(candidates, local_app_data / "Programs" / "Python" / f"Python{version}" / "python.exe")

    return [path for path in unique_paths(candidates) if path.exists()]


def parse_py_launcher_paths() -> list[Path]:
    try:
        completed = subprocess.run(
            ["py", "-0p"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
    except OSError:
        return []

    matches = re.findall(r"([A-Za-z]:\\[^\r\n]+python(?:w)?\.exe)", completed.stdout, flags=re.IGNORECASE)
    return [Path(match.strip()) for match in matches]


def unique_paths(paths: list[Path]) -> list[Path]:
    seen: set[str] = set()
    unique: list[Path] = []
    for path in paths:
        resolved = str(path).lower()
        if resolved in seen:
            continue
        seen.add(resolved)
        unique.append(path)
    return unique


def add_candidate(candidates: list[Path], candidate: str | Path | None) -> None:
    if not candidate:
        return
    candidates.append(Path(candidate))


def is_compatible_python(python_path: Path) -> bool:
    version = get_python_version(python_path)
    return version >= MIN_PYTHON


def get_python_version(python_path: Path) -> tuple[int, int]:
    try:
        completed = subprocess.run(
            [str(python_path), "-c", "import sys; print(f'{sys.version_info[0]}.{sys.version_info[1]}')"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
    except OSError:
        return (0, 0)

    if completed.returncode != 0:
        return (0, 0)

    parts = completed.stdout.strip().split(".")
    if len(parts) != 2 or not all(part.isdigit() for part in parts):
        return (0, 0)

    return int(parts[0]), int(parts[1])


def find_npm_cmd() -> Path:
    npm_on_path = shutil.which("npm.cmd")
    if npm_on_path:
        return Path(npm_on_path)

    default_path = Path("C:/Program Files/nodejs/npm.cmd")
    if default_path.exists():
        return default_path

    raise RuntimeError("npm.cmd not found. Install Node.js and try again.")


def ensure_backend_venv(runtime: RuntimePaths) -> None:
    if runtime.backend_python.exists() and is_compatible_python(runtime.backend_python):
        return
    if (runtime.backend_path / ".venv").exists():
        shutil.rmtree(runtime.backend_path / ".venv")
    subprocess.run(
        [str(runtime.bootstrap_python), "-m", "venv", str(runtime.backend_path / ".venv")],
        cwd=runtime.backend_path,
        check=True,
    )


def backend_dependencies_ready(runtime: RuntimePaths) -> bool:
    return module_imports_cleanly(runtime.backend_python, "fastapi", "uvicorn")


def frontend_dependencies_ready(runtime: RuntimePaths) -> bool:
    return (runtime.frontend_path / "node_modules").exists()


def module_imports_cleanly(python_path: Path, *modules: str) -> bool:
    if not python_path.exists():
        return False

    statement = "; ".join(f"import {module}" for module in modules)
    completed = subprocess.run(
        [str(python_path), "-c", statement],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    return completed.returncode == 0


def wait_for_port(host: str, port: int, timeout_seconds: float) -> bool:
    deadline = timeout_seconds + time.monotonic()
    while time.monotonic() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as connection:
            connection.settimeout(0.5)
            if connection.connect_ex((host, port)) == 0:
                return True
        time.sleep(0.25)
    return False
