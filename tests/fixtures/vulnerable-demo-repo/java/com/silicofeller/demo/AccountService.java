package com.silicofeller.demo;

import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.Statement;

/** INTENTIONALLY VULNERABLE demo class. Fake secrets only. */
public class AccountService {
    private static final String DB_PASSWORD = "FAKE-DEMO-PASSWORD-DO-NOT-USE"; // VULN: SECRET-004

    public void findAccount(Connection c, String owner) throws Exception {
        Statement st = c.createStatement();
        st.executeQuery("SELECT * FROM accounts WHERE owner = '" + owner + "'"); // VULN: SQLI-002
    }

    public byte[] hash(String pw) throws Exception {
        return MessageDigest.getInstance("MD5").digest(pw.getBytes()); // VULN: CRYPTO-012
    }

    public byte[] hashSafe(String pw) throws Exception {
        return MessageDigest.getInstance("SHA-256").digest(pw.getBytes()); // SAFE: TN-007
    }
}
