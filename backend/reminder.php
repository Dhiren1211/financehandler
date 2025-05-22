<?php
header("Content-Type: application/json");
require_once 'db.php';

$action = $_GET['action'] ?? '';

try {
    $db = new Database();
    $conn = $db->getConnection();

    switch ($action) {
        case 'get':
            $stmt = $conn->query("SELECT * FROM reminders ORDER BY date ASC");
            $reminders = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'reminders' => $reminders]);
            break;

        case 'add':
            $data = json_decode(file_get_contents('php://input'), true);
            error_log("Received reminder data: " . print_r($data, true)); // Debug
            if (!isset($data['description'], $data['date']) || empty($data['description']) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['date'])) {
                echo json_encode(['success' => false, 'message' => 'Invalid or missing input data']);
                exit;
            }
            $stmt = $conn->prepare("INSERT INTO reminders (description, date) VALUES (:description, :date)");
            $stmt->execute([
                ':description' => $data['description'],
                ':date' => $data['date']
            ]);
            echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);
            break;

        case 'delete':
            $id = $_GET['id'];
            $stmt = $conn->prepare("DELETE FROM reminders WHERE id = :id");
            $stmt->execute([':id' => $id]);
            echo json_encode(['success' => $stmt->rowCount() > 0]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} catch (PDOException $e) {
    error_log("Reminder error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>