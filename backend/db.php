<?php
class Database {
    private $host = 'localhost';
    private $db_name = 'finance_tracker';
    private $username = 'root';
    private $password = '';
    private $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            // Check if MySQL is running and accessible
            $this->conn = new PDO("mysql:host={$this->host};dbname={$this->db_name}", $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 3 // Short timeout for faster error
            ]);
        } catch(PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            // More user-friendly error message
            if (strpos($e->getMessage(), '2002') !== false) {
                throw new PDOException("Could not connect to database: MySQL server is not running or not accessible on '{$this->host}'.");
            } else {
                throw new PDOException("Could not connect to database: " . $e->getMessage());
            }
        }
        return $this->conn;
    }
}
?>