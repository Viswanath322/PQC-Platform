"""Demo banking web app. INTENTIONALLY VULNERABLE - never deploy."""
import hashlib
import os
import pickle
import sqlite3
import subprocess

import requests
from flask import Flask, request

app = Flask(__name__)
BASE_DIR = "/var/demo-bank/statements/"


def db():
    return sqlite3.connect("bank.db")


@app.route("/account")
def get_account():
    name = request.args.get("name")
    cur = db().cursor()
    cur.execute("SELECT * FROM accounts WHERE owner = '%s'" % name)  # VULN: SQLI-001
    return str(cur.fetchall())


@app.route("/account/safe")
def get_account_safe():
    name = request.args.get("name")
    cur = db().cursor()
    cur.execute("SELECT * FROM accounts WHERE owner = ?", (name,))  # SAFE: TN-001 parameterised query
    return str(cur.fetchall())


@app.route("/ping")
def ping():
    host = request.args.get("host")
    os.system("ping -c 1 " + host)  # VULN: CMDI-001
    return "ok"


@app.route("/lookup")
def lookup():
    domain = request.args.get("domain")
    out = subprocess.check_output("nslookup " + domain, shell=True)  # VULN: CMDI-002
    return out


@app.route("/statement")
def statement():
    fname = request.args.get("file")
    with open(BASE_DIR + fname) as fh:  # VULN: PATH-001
        return fh.read()


@app.route("/session", methods=["POST"])
def load_session():
    blob = request.get_data()
    return str(pickle.loads(blob))  # VULN: DESER-001


@app.route("/fetch")
def fetch():
    url = request.args.get("url")
    return requests.get(url).text  # VULN: SSRF-001


@app.route("/calc")
def calc():
    expr = request.args.get("expr")
    return str(eval(expr))  # VULN: EVAL-001


def checksum(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()  # SAFE: TN-002 SHA-256 for integrity


def safe_ping():
    subprocess.run(["ping", "-c", "1", "localhost"], check=True)  # SAFE: TN-003 no shell, constant args


if __name__ == "__main__":
    app.run(debug=True)  # VULN: CFG-003
