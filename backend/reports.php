<?php
header("Content-Type: application/json");
require_once 'db.php';

$startDate = $_GET['start_date'] ?? '';
$endDate = $_GET['end_date'] ?? '';
$type = $_GET['type'] ?? 'all';

try {
    $db = new Database();
    $conn = $db->getConnection();

    $query = "SELECT * FROM transactions WHERE date BETWEEN :start_date AND :end_date";
    $params = [':start_date' => $startDate, ':end_date' => $endDate];

    if ($type !== 'all') {
        $query .= " AND type = :type";
        $params[':type'] = $type;
    }

    $query .= " ORDER BY date DESC";

    $stmt = $conn->prepare($query);
    $stmt->execute($params);
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'transactions' => $transactions]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>