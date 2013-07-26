<?php 
require_once("../server/api/php/dbconnect.php");
require_once("../server/api/utility.php");

date_default_timezone_set("Asia/Hong_Kong") ;


try {
	$db = getConnection();
	$stmt = NULL;
	if(!empty($_GET["eid"])){ // submission extra id
		$stmt = $db->prepare("SELECT * FROM submission_extra WHERE id=:id");  
		$stmt->bindParam("id",$_GET["eid"]);
	}
	else if(!empty($_GET["sid"])&&!empty($_GET["tid"])){
		$stmt = $db->prepare("SELECT * FROM submission_extra WHERE submissionID=:submissionID AND taskID=:taskID");  
		$stmt->bindParam("submissionID", $_GET["sid"]);
		$stmt->bindParam("taskID", $_GET["tid"]);		
	}
	else {
		throw new Exception("404");
	}
	$stmt->execute();
	$submissionExtra = $stmt->fetchObject();  
	$db = NULL;
	if(empty($submissionExtra)){
		throw new Exception("404");
	}
	$content = $submissionExtra->content;
	if($submissionExtra->task_answerType == 6){
		$content = preg_replace('/^data:/', "data://", $content, 1);
		$content = file_get_contents($content);
	}
	header('Content-Type: '.$submissionExtra->contenttype); 
	header("Content-Length: " . strlen($content));
	echo $content;
	//echo '<img src="'.$content.'" />';;

} catch(Exception $e) {
	header("HTTP/1.0 404 Not Found", true, 404); 
	echo "error";
	$db = NULL;
}


?>