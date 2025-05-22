<?php
header("Content-Type: application/json");
require_once 'db.php';

$action = $_GET['action'] ?? '';

try {
    $db = new Database();
    $conn = $db->getConnection();

    switch ($action) {
        case 'add':
            $data = json_decode(file_get_contents('php://input'), true);
            error_log("Received transaction data: " . print_r($data, true)); // Debug
            if (!isset($data['type'], $data['description'], $data['amount'], $data['currency'], $data['date']) ||
                empty($data['description']) || !is_numeric($data['amount']) || $data['amount'] <= 0 ||
                !in_array($data['currency'], ['USD', 'NPR', 'KRW']) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['date'])) {
                echo json_encode(['success' => false, 'message' => 'Invalid or missing input data']);
                exit;
            }
            $stmt = $conn->prepare("INSERT INTO transactions (type, description, amount, currency, date) VALUES (:type, :description, :amount, :currency, :date)");
            $stmt->execute([
                ':type' => $data['type'],
                ':description' => $data['description'],
                ':amount' => $data['amount'],
                ':currency' => $data['currency'],
                ':date' => $data['date']
            ]);
            echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);
            break;

        case 'get':
            $stmt = $conn->query("SELECT * FROM transactions ORDER BY date DESC");
            $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'transactions' => $transactions]);
            break;

        case 'update':
            $data = json_decode(file_get_contents('php://input'), true);
            error_log("Received update data: " . print_r($data, true)); // Debug
            if (!isset($data['id'], $data['type'], $data['description'], $data['amount'], $data['currency'], $data['date'])) {
                echo json_encode(['success' => false, 'message' => 'Invalid or missing input data']);
                exit;
            }
            $stmt = $conn->prepare("UPDATE transactions SET type=:type, description=:description, amount=:amount, currency=:currency, date=:date WHERE id=:id");
            $stmt->execute([
                ':id' => $data['id'],
                ':type' => $data['type'],
                ':description' => $data['description'],
                ':amount' => $data['amount'],
                ':currency' => $data['currency'],
                ':date' => $data['date']
            ]);
            echo json_encode(['success' => $stmt->rowCount() > 0]);
            break;

        case 'delete':
            $id = $_GET['id'];
            $stmt = $conn->prepare("DELETE FROM transactions WHERE id = :id");
            $stmt->execute([':id' => $id]);
            echo json_encode(['success' => $stmt->rowCount() > 0]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} catch (PDOException $e) {
    error_log("Transaction error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>