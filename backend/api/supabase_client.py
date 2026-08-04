import os
import json
from datetime import datetime
from api.config import SUPABASE_URL, SUPABASE_KEY, UPLOAD_FOLDER

class MockStorageBucket:
    def __init__(self, bucket_name):
        self.bucket_name = bucket_name

    def upload(self, path, file, file_options=None):
        return {"path": path}

    def get_public_url(self, filename):
        return f"/uploads/{filename}"

    def remove(self, filenames):
        for name in filenames:
            local_path = os.path.join(UPLOAD_FOLDER, name)
            if os.path.exists(local_path):
                os.remove(local_path)
        return {"data": filenames}

class MockStorage:
    def __init__(self):
        pass

    def from_(self, bucket_name):
        return MockStorageBucket(bucket_name)

class MockTable:
    def __init__(self, table_name):
        self.table_name = table_name
        self.db_file = "predictions_db.json"
        self._init_db()

    def _init_db(self):
        if not os.path.exists(self.db_file):
            with open(self.db_file, "w") as f:
                json.dump([], f)

    def _read_db(self):
        self._init_db()
        try:
            with open(self.db_file, "r") as f:
                return json.load(f)
        except Exception:
            return []

    def _write_db(self, data):
        with open(self.db_file, "w") as f:
            json.dump(data, f, indent=4)

    def insert(self, row):
        class InsertBuilder:
            def __init__(self, parent, row):
                self.parent = parent
                self.row = row
            def execute(self):
                db = self.parent._read_db()
                next_id = max([r.get("id", 0) for r in db] or [0]) + 1
                new_row = {
                    "id": next_id,
                    "created_at": datetime.utcnow().isoformat() + "Z",
                    **self.row
                }
                db.append(new_row)
                self.parent._write_db(db)
                class Result:
                    def __init__(self, data):
                        self.data = [data]
                return Result(new_row)
        return InsertBuilder(self, row)

    def select(self, columns="*"):
        class SelectBuilder:
            def __init__(self, parent):
                self.parent = parent
                self.query_data = self.parent._read_db()
            def order(self, column, desc=True):
                self.query_data = sorted(
                    self.query_data,
                    key=lambda x: x.get(column, ""),
                    reverse=desc
                )
                return self
            def range(self, start, end):
                self.query_data = self.query_data[start:end+1]
                return self
            def eq(self, column, value):
                self.query_data = [r for r in self.query_data if str(r.get(column)) == str(value)]
                return self
            def execute(self):
                class Result:
                    def __init__(self, data):
                        self.data = data
                return Result(self.query_data)
        return SelectBuilder(self)

    def delete(self):
        class DeleteBuilder:
            def __init__(self, parent):
                self.parent = parent
                self.eq_col = None
                self.eq_val = None
            def eq(self, column, value):
                self.eq_col = column
                self.eq_val = value
                return self
            def execute(self):
                db = self.parent._read_db()
                if self.eq_col:
                    db = [r for r in db if str(r.get(self.eq_col)) != str(self.eq_val)]
                self.parent._write_db(db)
                class Result:
                    def __init__(self, data):
                        self.data = data
                return Result(db)
        return DeleteBuilder(self)

class MockSupabaseClient:
    def __init__(self):
        self.storage = MockStorage()
        self.is_mock = True

    def table(self, table_name):
        return MockTable(table_name)

# Initialize client
supabase = None
if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL != "your_supabase_url" and SUPABASE_KEY != "your_supabase_key":
    try:
        from supabase import create_client
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        supabase.is_mock = False
        print("Initialized real Supabase client.")
    except Exception as e:
        print(f"Failed to initialize real Supabase client: {e}. Falling back to mock client.")
        supabase = MockSupabaseClient()
else:
    print("Supabase credentials not set or placeholder used. Running in LOCAL/MOCK mode (all files/history saved locally).")
    supabase = MockSupabaseClient()